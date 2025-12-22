import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getDB, initDB } from './config/database';
import { dataFetcher } from './services/dataFetcher';
import { aiStrategist } from './services/aiStrategist';
import logger from './utils/logger';
import { buildPreparedTransactions } from './services/txBuilder';
import { trackCctxStatus } from './services/cctxTracker';

// Initialize Express
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug endpoint for testing AI service
app.post('/api/debug/test-ai', async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }
    
    logger.info(`[DEBUG] Testing AI with input: "${input}"`);
    const result = await aiStrategist.parseIntent(input);
    res.json({ 
      success: true, 
      result,
      hasApiKey: !!process.env.DASHSCOPE_API_KEY && process.env.DASHSCOPE_API_KEY !== 'sk-placeholder'
    });
  } catch (error: any) {
    logger.error(`[DEBUG] AI test failed: ${error?.message || error}`);
    res.status(500).json({ 
      success: false, 
      error: error?.message || String(error),
      hasApiKey: !!process.env.DASHSCOPE_API_KEY && process.env.DASHSCOPE_API_KEY !== 'sk-placeholder'
    });
  }
});

// --- API Routes (Moved from index.ts and enhanced) ---

// 1. Data Fetcher Routes
app.get('/api/assets/:address', async (req, res) => {
  try {
    const data = await dataFetcher.getAssetOverview(req.params.address);
    res.json(data);
  } catch (error) {
    logger.error(`Error fetching assets for ${req.params.address}: ${error}`);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

app.get('/api/protocols', async (req, res) => {
  try {
    const data = await dataFetcher.getProtocols();
    res.json(data);
  } catch (error) {
    logger.error(`Error fetching protocols: ${error}`);
    res.status(500).json({ error: 'Failed to fetch protocols' });
  }
});

// 2. AI Strategy Routes
app.post('/api/chat/strategy', async (req, res) => {
  const startTime = Date.now();
  const timeout = 30000; // 30 seconds timeout
  let timeoutId: NodeJS.Timeout | null = null;

  // Set response timeout
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Request timeout after 30 seconds'));
    }, timeout);
  });

  try {
    const { input, address } = req.body;
    
    // Request validation
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      logger.warn(`Invalid request: missing or empty input field`);
      return res.status(400).json({ error: 'Input is required and must be a non-empty string' });
    }
    
    if (!address || typeof address !== 'string') {
      logger.warn(`Invalid request: missing or invalid address field`);
      return res.status(400).json({ error: 'Address is required' });
    }

    logger.info(`[${address}] Received strategy request: "${input.substring(0, 100)}${input.length > 100 ? '...' : ''}"`);
    
    // Race between actual processing and timeout
    const result = await Promise.race([
      (async () => {
    // Parse intent (now returns message too)
        logger.debug(`[${address}] Starting intent parsing...`);
    const parsedResult = await aiStrategist.parseIntent(input);
        logger.debug(`[${address}] Intent parsed: ${JSON.stringify(parsedResult)}`);
        
        // Generate strategies
        logger.debug(`[${address}] Generating strategies...`);
    const strategies = await aiStrategist.generateStrategies(parsedResult, address, input);
        logger.info(`[${address}] Generated ${strategies.length} strategies in ${Date.now() - startTime}ms`);
    
    // Notify via Socket
        try {
    io.to(address).emit('strategy_generated', { strategies });
        } catch (socketError) {
          logger.warn(`[${address}] Failed to emit socket event: ${socketError}`);
        }

        return {
      intent: parsedResult,
      strategies,
      message: parsedResult.message || `Based on your request, I've generated ${strategies.length} strategies.`
        };
      })(),
      timeoutPromise
    ]) as any;

    // Clear timeout if request completed in time
    if (timeoutId) clearTimeout(timeoutId);

    res.json(result);
  } catch (error: any) {
    // Clear timeout if error occurred
    if (timeoutId) clearTimeout(timeoutId);
    
    const elapsed = Date.now() - startTime;
    const errorMessage = error?.message || String(error);
    const errorStack = error?.stack || 'No stack trace';
    
    logger.error(`[${req.body?.address || 'unknown'}] Failed to generate strategy after ${elapsed}ms: ${errorMessage}`);
    logger.debug(`[${req.body?.address || 'unknown'}] Error stack: ${errorStack}`);
    
    // Check if it's a timeout error
    if (errorMessage.includes('timeout')) {
      res.status(504).json({ 
        error: 'Request timeout. The AI service took too long to respond. Please try again.',
        timeout: true
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate strategy',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
});

// 3. Strategy Execution Routes
app.post('/api/strategy/execute', async (req, res) => {
  const startTime = Date.now();
  const timeout = 60000; // 60 seconds timeout for execution
  let timeoutId: NodeJS.Timeout | null = null;

  // Set response timeout
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Execution timeout after 60 seconds'));
    }, timeout);
  });

  try {
    const { strategyId, address, steps } = req.body;
    
    // Request validation
    if (!strategyId || typeof strategyId !== 'string') {
      logger.warn(`Invalid request: missing or invalid strategyId`);
      return res.status(400).json({ error: 'strategyId is required and must be a string' });
    }
    
    if (!address || typeof address !== 'string') {
      logger.warn(`Invalid request: missing or invalid address`);
      return res.status(400).json({ error: 'address is required' });
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      logger.warn(`Invalid request: missing or invalid steps`);
      return res.status(400).json({ error: 'steps is required and must be a non-empty array' });
    }

    logger.info(`[${address}] Executing strategy ${strategyId} with ${steps.length} steps`);
    
    // Race between actual execution and timeout
    const result = await Promise.race([
      (async () => {
        // Import execution engine
        const { executionEngine } = await import('./services/executionEngine');
        
        // Note: In production, we should NOT use privateKey from request
        // Instead, transactions should be signed on the frontend using MetaMask
        // For now, we'll use a placeholder since we're using mock execution
        const privateKey = '0x0000000000000000000000000000000000000000000000000000000000000000';
        
        // Execute strategy steps
        logger.debug(`[${address}] Starting strategy execution...`);
        const executionResults = await executionEngine.executeStrategy(steps, privateKey);
        logger.info(`[${address}] Strategy execution completed in ${Date.now() - startTime}ms`);
    
        // Notify via Socket
        try {
          io.to(address).emit('strategy_executed', { 
            strategyId,
            results: executionResults,
            status: executionResults.every(r => r.status === 'success') ? 'success' : 'partial'
          });
        } catch (socketError) {
          logger.warn(`[${address}] Failed to emit socket event: ${socketError}`);
        }

        return {
          strategyId,
          results: executionResults,
          status: executionResults.every(r => r.status === 'success') ? 'success' : 'partial',
          totalSteps: steps.length,
          successfulSteps: executionResults.filter(r => r.status === 'success').length
        };
      })(),
      timeoutPromise
    ]) as any;

    // Clear timeout if request completed in time
    if (timeoutId) clearTimeout(timeoutId);

    res.json(result);
  } catch (error: any) {
    // Clear timeout if error occurred
    if (timeoutId) clearTimeout(timeoutId);
    
    logger.error(`Strategy execution error: ${error.message}`, error);
    const statusCode = error.message.includes('timeout') ? 504 : 500;
    res.status(statusCode).json({ 
      error: error.message || 'Failed to execute strategy',
      timestamp: Date.now()
    });
  }
});

// 4. Strategy Preparation Routes (frontend-signed execution)
app.post('/api/strategy/prepare', async (req, res) => {
  try {
    const { steps, address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'address is required' });
    }
    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: 'steps is required and must be a non-empty array' });
    }

    const txs = await buildPreparedTransactions(steps, address);
    res.json({ transactions: txs });
  } catch (error: any) {
    logger.error(`Strategy prepare error: ${error.message}`, error);
    res.status(500).json({ error: error.message || 'Failed to prepare strategy' });
  }
});

app.post('/api/strategy/track', async (req, res) => {
  try {
    const { hash, timeoutSeconds } = req.body;
    if (!hash || typeof hash !== 'string') {
      return res.status(400).json({ error: 'hash is required' });
    }

    const result = await trackCctxStatus(hash, Number(timeoutSeconds) || 120);
    res.json(result);
  } catch (error: any) {
    logger.error(`Strategy track error: ${error.message}`, error);
    res.status(500).json({ error: error.message || 'Failed to track strategy' });
  }
});

// 5. Transaction Log Routes
app.get('/api/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    if (!address) {
      return res.status(400).json({ error: 'address is required' });
    }

    const db = getDB();
    const rows = await db.all<any[]>(
      `SELECT * FROM transactions WHERE user_address = ? ORDER BY tx_timestamp DESC, created_at DESC`,
      [address]
    );

    const transactions = rows.map((row) => {
      const details = row.details ? JSON.parse(row.details) : {};
      return {
        id: row.id,
        runId: row.run_id || row.strategy_id,
        hash: row.tx_hash,
        description: row.description || details.description,
        chainId: row.chain_id || Number(row.chain),
        from: details.from,
        to: details.to,
        status: row.status,
        timestamp: row.tx_timestamp || Date.parse(row.created_at),
      };
    });

    res.json(transactions);
  } catch (error: any) {
    logger.error(`Failed to load transactions: ${error.message}`, error);
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const {
      id,
      runId,
      address,
      hash,
      chainId,
      status,
      description,
      from,
      to,
      timestamp,
    } = req.body;

    if (!id || !address || !hash || !chainId || !status) {
      return res.status(400).json({ error: 'id, address, hash, chainId, status are required' });
    }

    const db = getDB();
    const details = JSON.stringify({ description, from, to });
    const txTimestamp = Number(timestamp) || Date.now();

    await db.run(
      `INSERT INTO transactions (
        id, strategy_id, user_address, run_id, tx_hash, chain, chain_id, status, description, tx_timestamp, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        strategy_id=excluded.strategy_id,
        user_address=excluded.user_address,
        run_id=excluded.run_id,
        tx_hash=excluded.tx_hash,
        chain=excluded.chain,
        chain_id=excluded.chain_id,
        status=excluded.status,
        description=excluded.description,
        tx_timestamp=excluded.tx_timestamp,
        details=excluded.details`,
      [
        id,
        runId || null,
        address,
        runId || null,
        hash,
        String(chainId),
        Number(chainId),
        status,
        description || null,
        txTimestamp,
        details,
      ]
    );

    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Failed to save transaction: ${error.message}`, error);
    res.status(500).json({ error: 'Failed to save transaction' });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const {
      status,
      hash,
      chainId,
      description,
      from,
      to,
      timestamp,
      address,
      runId,
    } = req.body;

    const db = getDB();
    const existing = await db.get<any>(
      `SELECT * FROM transactions WHERE id = ?`,
      [id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'transaction not found' });
    }

    const existingDetails = existing.details ? JSON.parse(existing.details) : {};
    const details = JSON.stringify({
      ...existingDetails,
      description: description ?? existing.description,
      from: from ?? existingDetails.from,
      to: to ?? existingDetails.to,
    });

    await db.run(
      `UPDATE transactions SET
        status = COALESCE(?, status),
        tx_hash = COALESCE(?, tx_hash),
        chain = COALESCE(?, chain),
        chain_id = COALESCE(?, chain_id),
        description = COALESCE(?, description),
        tx_timestamp = COALESCE(?, tx_timestamp),
        user_address = COALESCE(?, user_address),
        run_id = COALESCE(?, run_id),
        details = ?
      WHERE id = ?`,
      [
        status || null,
        hash || null,
        chainId ? String(chainId) : null,
        chainId ? Number(chainId) : null,
        description || null,
        timestamp ? Number(timestamp) : null,
        address || null,
        runId || null,
        details,
        id,
      ]
    );

    res.json({ success: true });
  } catch (error: any) {
    logger.error(`Failed to update transaction: ${error.message}`, error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// Socket.io Connection
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join', (address) => {
    socket.join(address);
    logger.info(`User ${address} joined their room`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

export { httpServer, initDB };

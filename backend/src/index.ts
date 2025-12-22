import express from 'express';
import cors from 'cors';
import { dataFetcher } from './services/dataFetcher';
import { aiStrategist } from './services/aiStrategist';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Asset Routes
app.get('/api/assets/:address', async (req, res) => {
  try {
    const data = await dataFetcher.getAssetOverview(req.params.address);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Protocol Routes
app.get('/api/protocols', async (req, res) => {
  try {
    const data = await dataFetcher.getProtocols();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch protocols' });
  }
});

// AI Chat Routes
app.post('/api/chat/strategy', async (req, res) => {
  try {
    const { input, address } = req.body;
    const intent = await aiStrategist.parseIntent(input);
    const strategies = await aiStrategist.generateStrategies(intent, address, input);
    
    res.json({
      intent,
      strategies,
      // Mock Qwen text response
      message: `Based on your request for "${input}", I've generated ${strategies.length} strategies focusing on ${intent.goal}.`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate strategy' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

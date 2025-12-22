import { Intent, StrategyOption, StrategyStep, Asset, ProtocolInfo } from '../../../shared/types';
import { dataFetcher } from './dataFetcher';
import { v4 as uuidv4 } from 'uuid';
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

// Define the schema for the AI output
const intentSchema = {
  name: "identify_intent",
  description: "Identify the user's investment intent and risk preference",
  parameters: {
    type: "object",
    properties: {
      goal: {
        type: "string",
        enum: ["maximize_yield", "minimize_risk", "balanced"],
        description: "The primary goal of the user"
      },
      riskMax: {
        type: "number",
        description: "Maximum risk tolerance on a scale of 1-10 (1=safest, 10=degen)",
        minimum: 1,
        maximum: 10
      },
      chains: {
        type: "array",
        items: { type: "string", enum: ["ETH", "Solana", "BSC", "ZetaChain"] },
        description: "Preferred chains mentioned by user"
      },
      message: {
        type: "string",
        description: "A friendly conversational response to the user in Chinese. (Please always use Chinese)"
      }
    },
    required: ["goal", "riskMax", "message"]
  }
};

interface IntentResult {
  goal: string;
  riskMax: number;
  chains?: string[];
  message: string;
}

export class AIStrategist {
  private model: ChatOpenAI;

  constructor() {
    // Initialize Qwen via OpenAI-compatible API
    // Try international endpoint first, fallback to domestic if needed
    // Base URL: https://dashscope-intl.aliyuncs.com/compatible-mode/v1 (international)
    // Alternative: https://dashscope.aliyuncs.com/compatible-mode/v1 (domestic)
    // Endpoint: POST https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions
    
    // We are now using system-wide proxy settings, so no need to manipulate proxy env vars here.
    // The previous code was trying to bypass proxy which caused timeout because direct connection is blocked.
    // Now that we have a working proxy at 127.0.0.1:26665, we should let axios/langchain use it.
    
    // Explicitly check for proxy env vars to debug
    logger.debug(`AIStrategist Proxy Env: HTTP_PROXY=${process.env.HTTP_PROXY || process.env.http_proxy}, HTTPS_PROXY=${process.env.HTTPS_PROXY || process.env.https_proxy}`);

    const baseURL = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    
    // Explicitly configure proxy agent to ensure Node process uses it
    const { HttpsProxyAgent } = require('https-proxy-agent');
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:26665';
    const agent = new HttpsProxyAgent(proxyUrl);
    
    this.model = new ChatOpenAI({
      openAIApiKey: process.env.DASHSCOPE_API_KEY || 'sk-placeholder',
      configuration: {
        baseURL: baseURL,
        // Add timeout configuration (in milliseconds)
        timeout: 30000, // Increased to 30s
        httpAgent: agent,
        httpsAgent: agent,
      } as any, // Cast to any to bypass type check for httpAgent/httpsAgent
      modelName: "qwen-max",
      temperature: 0.2,
      maxRetries: 1, // Retry once on failure
    });
    
    if (process.env.DASHSCOPE_API_KEY && process.env.DASHSCOPE_API_KEY !== 'sk-placeholder') {
      logger.info(`AIStrategist initialized with DashScope API (${baseURL}), proxy bypassed for DashScope domains`);
    } else {
      logger.warn('AIStrategist initialized without API key, will use fallback parser');
    }
  }

  /**
   * Parses user natural language input into a structured Intent using Qwen.
   */
  async parseIntent(input: string): Promise<Intent & { message: string }> {
    const startTime = Date.now();
    const aiTimeout = 15000; // 15 seconds timeout for AI call
    try {
      logger.debug(`Starting parseIntent with input: "${input.substring(0, 100)}${input.length > 100 ? '...' : ''}"`);
      
      if (!process.env.DASHSCOPE_API_KEY || process.env.DASHSCOPE_API_KEY === 'sk-placeholder') {
        logger.warn('Qwen API Key missing, falling back to regex parser');
        return this.parseIntentFallback(input);
      }

      logger.debug('Invoking Qwen model via DashScope API...');
      const baseURL = process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
      logger.debug(`API Endpoint: ${baseURL}/chat/completions`);
      
      // Temporarily disable proxy for DashScope API call
      const originalHttpProxy = process.env.http_proxy;
      const originalHttpsProxy = process.env.https_proxy;
      const originalHttpProxyUpper = process.env.HTTP_PROXY;
      const originalHttpsProxyUpper = process.env.HTTPS_PROXY;
      
      // Unset proxy for DashScope API call
      delete process.env.http_proxy;
      delete process.env.https_proxy;
      delete process.env.HTTP_PROXY;
      delete process.env.HTTPS_PROXY;
      
      // Create timeout promise (slightly longer than HTTP timeout to catch network issues)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`AI service timeout after ${aiTimeout}ms`));
        }, aiTimeout);
      });

      let response: any;
      try {
        // Race between AI call and timeout
        response = await Promise.race([
          this.model.invoke(
            [
              new SystemMessage("你是一个 DeFi 专家助手。分析用户的请求。返回结构化的意图（intent）以及一条友好的中文对话回复（'message'）。请始终使用中文回复，简要解释你正在寻找的策略。"),
              new HumanMessage(input),
            ],
            {
              functions: [intentSchema],
              function_call: { name: "identify_intent" },
            }
          ).catch((error: any) => {
            // Log detailed error information
            logger.error(`AI model invoke error: ${error?.message || error}`);
            if (error?.response) {
              logger.error(`API Response status: ${error.response.status}`);
              logger.error(`API Response data: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
          }),
          timeoutPromise
        ]);
        
        // Restore proxy settings
        if (originalHttpProxy) process.env.http_proxy = originalHttpProxy;
        if (originalHttpsProxy) process.env.https_proxy = originalHttpsProxy;
        if (originalHttpProxyUpper) process.env.HTTP_PROXY = originalHttpProxyUpper;
        if (originalHttpsProxyUpper) process.env.HTTPS_PROXY = originalHttpsProxyUpper;
      } catch (error) {
        // Restore proxy settings even on error
        if (originalHttpProxy) process.env.http_proxy = originalHttpProxy;
        if (originalHttpsProxy) process.env.https_proxy = originalHttpsProxy;
        if (originalHttpProxyUpper) process.env.HTTP_PROXY = originalHttpProxyUpper;
        if (originalHttpsProxyUpper) process.env.HTTPS_PROXY = originalHttpsProxyUpper;
        throw error;
      }

      const elapsed = Date.now() - startTime;
      logger.debug(`Qwen model response received in ${elapsed}ms`);

      const functionCall = (response as any).additional_kwargs?.function_call;
      if (!functionCall || !functionCall.arguments) {
        logger.warn('No function call in response, falling back to regex parser');
        return this.parseIntentFallback(input);
      }

      let result: IntentResult;
      try {
        result = JSON.parse(functionCall.arguments) as IntentResult;
      } catch (parseError) {
        logger.error(`Failed to parse AI response: ${parseError}`);
        logger.debug(`Raw function call arguments: ${functionCall.arguments}`);
        return this.parseIntentFallback(input);
      }

      // Validate result
      if (!result.goal || !result.message || typeof result.riskMax !== 'number') {
        logger.warn('Invalid AI response structure, falling back to regex parser');
        return this.parseIntentFallback(input);
      }

      logger.info(`AI parsed intent in ${elapsed}ms: ${JSON.stringify(result)}`);
      
      // Merge with defaults
      const transferAmount = this.detectEthToBnbTransfer(input);
      const message = transferAmount !== null
        ? `我可以通过 ZetaChain 跨链帮你把 ${transferAmount} ETH 转成 BNB：先 bridge 到 ZetaChain，再用 ZetaSwap 换成 ZRC20-BNB，最后 withdraw 到 BSC Testnet。确认后我会生成交易步骤。`
        : result.message;

      return {
        goal: result.goal as Intent['goal'],
        riskMax: this.adjustRiskMax(input, result.goal as Intent['goal'], result.riskMax),
        chains: (result.chains as any[])?.length ? result.chains as any[] : ['ETH', 'Solana', 'BSC', 'ZetaChain'],
        message
      };

    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      const errorMessage = error?.message || String(error);
      
      if (errorMessage.includes('timeout')) {
        logger.warn(`AI Intent Parsing timed out after ${elapsed}ms, using fallback`);
      } else {
        logger.error(`AI Intent Parsing failed after ${elapsed}ms: ${errorMessage}`);
        if (error?.stack) {
          logger.debug(`Error stack: ${error.stack}`);
        }
      }
      
      // Always return fallback result instead of throwing
      return this.parseIntentFallback(input);
    }
  }

  // Original fallback logic
  private parseIntentFallback(input: string): Intent & { message: string } {
    logger.debug('Using fallback intent parser');
    const lowerInput = input.toLowerCase();
    let goal: Intent['goal'] = 'balanced';
    
    // Improved keyword detection
    if ((lowerInput.includes('risk') && (lowerInput.includes('low') || lowerInput.includes('min'))) ||
        lowerInput.includes('safe') || lowerInput.includes('保守')) {
      goal = 'minimize_risk';
    } else if (lowerInput.includes('yield') || lowerInput.includes('high return') || 
               lowerInput.includes('maximize') || lowerInput.includes('最高收益') ||
               lowerInput.includes('收益最大化')) {
      goal = 'maximize_yield';
    }
    
    let riskMax = 5;
    if (goal === 'minimize_risk') riskMax = 3;
    if (goal === 'maximize_yield') riskMax = 8;
    riskMax = this.adjustRiskMax(input, goal, riskMax);

    // Detect chains mentioned
    const chains: string[] = [];
    if (lowerInput.includes('eth') || lowerInput.includes('ethereum')) chains.push('ETH');
    if (lowerInput.includes('sol') || lowerInput.includes('solana')) chains.push('Solana');
    if (lowerInput.includes('bsc') || lowerInput.includes('binance')) chains.push('BSC');
    if (lowerInput.includes('zeta') || lowerInput.includes('zetachain')) chains.push('ZetaChain');

    const finalChains = chains.length > 0 ? chains : ['ETH', 'Solana', 'BSC', 'ZetaChain'];

    return {
      goal,
      riskMax,
      chains: finalChains as any,
      message: "虽然AI服务暂时不可用，但我已根据您的关键词生成了默认策略。"
    };
  }

  /**
   * Generates actionable DeFi strategies based on intent and available data.
   * (Currently heuristic-based, can be upgraded to AI-generated later)
   */
  async generateStrategies(intent: Intent, address: string, rawInput?: string): Promise<StrategyOption[]> {
    const transferAmount = rawInput ? this.detectEthToBnbTransfer(rawInput) : null;
    if (transferAmount !== null) {
      const amount = transferAmount;
      return [
        {
          id: uuidv4(),
          label: '跨链 ETH -> BNB',
          description: '使用 ZetaChain 跨链，将 Sepolia ETH 兑换为 BSC Testnet BNB',
          actions: 'bridge->swap->withdraw',
          expectedYield: 0,
          riskScore: 5,
          rationale: '通过 ZetaChain 跨链与 ZRC20 Swap 完成 ETH 到 BNB 的转换。',
          steps: [
            {
              id: uuidv4(),
              type: 'bridge',
              fromChain: 'ETH',
              toChain: 'ZetaChain',
              asset: 'ETH',
              amount,
              status: 'pending',
            },
            {
              id: uuidv4(),
              type: 'swap',
              fromChain: 'ZetaChain',
              toChain: 'ZetaChain',
              asset: 'ZRC20-ETH->ZRC20-BNB',
              amount,
              protocol: 'ZetaSwap',
              status: 'pending',
            },
            {
              id: uuidv4(),
              type: 'withdraw',
              fromChain: 'ZetaChain',
              toChain: 'BSC',
              asset: 'ZRC20-BNB',
              amount,
              protocol: 'ZetaChain Gateway',
              status: 'pending',
            },
          ],
        },
      ];
    }
    const assetOverview = await dataFetcher.getAssetOverview(address);
    const protocols = await dataFetcher.getProtocols();

    const stableSymbols = new Set(['USDC', 'USDT', 'DAI', 'BUSD']);
    const zetaProtocols = protocols.filter(p => p.chain === 'ZetaChain');
    const eligibleProtocols = zetaProtocols.filter(p => p.riskIndex <= intent.riskMax);
    const candidateProtocols = eligibleProtocols.length > 0 ? eligibleProtocols : zetaProtocols;

    const weights = this.getScoringWeights(intent.goal);
    const scoredProtocols = candidateProtocols
      .map(p => ({
        protocol: p,
        score: p.apy * weights.apy - p.riskIndex * weights.risk + Math.log((p.tvl || 0) + 1) * weights.tvl,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.protocol);

    const assets = [...assetOverview.assets].sort((a, b) => b.valueUSD - a.valueUSD);
    const stableAssets = assets.filter(a => stableSymbols.has(a.symbol));

    const strategies: StrategyOption[] = [];
    for (const protocol of scoredProtocols) {
      const strategy = this.buildZetaStrategy(protocol, assets, stableAssets, intent);
      if (strategy) strategies.push(strategy);
    }

    if (strategies.length === 0) {
      const fallbackProtocol = candidateProtocols[0];
      if (fallbackProtocol) {
        const fallback = this.buildZetaStrategy(fallbackProtocol, assets, stableAssets, intent);
        if (fallback) strategies.push(fallback);
      }
    }

    return strategies;
  }

  private getScoringWeights(goal: Intent['goal']) {
    if (goal === 'maximize_yield') {
      return { apy: 1.0, risk: 0.3, tvl: 0.1 };
    }
    if (goal === 'minimize_risk') {
      return { apy: 0.4, risk: 1.0, tvl: 0.1 };
    }
    return { apy: 0.7, risk: 0.6, tvl: 0.1 };
  }

  private buildZetaStrategy(
    protocol: ProtocolInfo,
    assets: Asset[],
    stableAssets: Asset[],
    intent: Intent
  ): StrategyOption | null {
    const sourceAsset = stableAssets[0] || assets[0];
    if (!sourceAsset) return null;

    const steps: StrategyStep[] = [];
    const zrc20Source = this.toZrc20Symbol(sourceAsset.symbol);
    let investAmount = this.pickAmount(sourceAsset, stableAssets.includes(sourceAsset));

    if (protocol.token === 'ZETA') {
      const zetaAsset = assets.find(a => a.symbol === 'ZETA' && a.chain === 'ZetaChain');
      if (zetaAsset && zetaAsset.balance > 0) {
        investAmount = this.pickAmount(zetaAsset, false);
        steps.push(this.buildStakeStep('ZETA', investAmount, protocol.name));
      } else {
        steps.push(...this.buildBridgeSteps(sourceAsset, investAmount));
        if (zrc20Source !== 'ZETA') {
          steps.push(this.buildSwapStep(zrc20Source, 'ZETA', investAmount));
        }
        steps.push(this.buildStakeStep('ZETA', investAmount, protocol.name));
      }
    } else if (protocol.token === 'USDC') {
      steps.push(...this.buildBridgeSteps(sourceAsset, investAmount));
      if (zrc20Source !== 'ZRC20-USDC') {
        steps.push(this.buildSwapStep(zrc20Source, 'ZRC20-USDC', investAmount));
      }
      steps.push(this.buildDepositStep('ZRC20-USDC', investAmount, protocol.name));
    } else if (protocol.token === 'ZETA-USDC') {
      steps.push(...this.buildBridgeSteps(sourceAsset, investAmount));
      if (zrc20Source !== 'ZRC20-USDC') {
        steps.push(this.buildSwapStep(zrc20Source, 'ZRC20-USDC', investAmount));
      }
      const halfAmount = Number((investAmount / 2).toFixed(6));
      steps.push(this.buildSwapStep('ZRC20-USDC', 'ZETA', halfAmount));
      steps.push(this.buildDepositStep('ZETA-USDC', investAmount, protocol.name));
    } else {
      steps.push(...this.buildBridgeSteps(sourceAsset, investAmount));
      steps.push(this.buildDepositStep(protocol.token, investAmount, protocol.name));
    }

    return {
      id: uuidv4(),
      label: `${protocol.name} 动态策略`,
      description: `基于当前资产与风险偏好，使用 ZetaChain 跨链与 ZRC20 资产执行 ${protocol.name} 策略`,
      actions: steps.map(s => s.type).join('->'),
      expectedYield: Number(protocol.apy.toFixed(2)),
      riskScore: protocol.riskIndex,
      rationale: `选择 ${protocol.name}（APY ${protocol.apy}%、风险 ${protocol.riskIndex}/10），并通过 ZetaChain 跨链与 ZRC20 Swap 完成组合。`,
      steps,
    };
  }

  private toZrc20Symbol(symbol: string): string {
    if (symbol === 'ZETA') return 'ZETA';
    return `ZRC20-${symbol}`;
  }

  private pickAmount(asset: Asset, isStable: boolean): number {
    const ratio = isStable ? 0.3 : 0.5;
    const raw = asset.balance * ratio;
    const min = isStable ? 50 : 10;
    const max = isStable ? 2000 : 200;
    return Number(Math.min(max, Math.max(min, raw)).toFixed(6));
  }

  private detectEthToBnbTransfer(input: string): number | null {
    const lowerInput = input.toLowerCase();
    const wantsEthToBnb =
      (lowerInput.includes('eth') || lowerInput.includes('以太')) &&
      (lowerInput.includes('bnb') || lowerInput.includes('币安'));
    if (!wantsEthToBnb) return null;

    const normalizedAmount = (value: string) => {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount <= 0) return null;
      return Number(amount.toFixed(6));
    };

    const taggedMatch = lowerInput.match(/([0-9]+(?:\.[0-9]+)?)\s*(eth|以太坊|以太)/i);
    if (taggedMatch && taggedMatch[1]) {
      const amount = normalizedAmount(taggedMatch[1]);
      if (amount !== null) return amount;
    }

    const numberMatches = lowerInput.match(/([0-9]+(?:\.[0-9]+)?)/g);
    if (numberMatches && numberMatches.length === 1) {
      const amount = normalizedAmount(numberMatches[0]);
      if (amount !== null) return amount;
    }

    return 0.01;
  }

  private adjustRiskMax(input: string, goal: Intent['goal'], riskMax: number): number {
    const lowerInput = input.toLowerCase();
    const highRiskRequested =
      lowerInput.includes('高风险') ||
      lowerInput.includes('激进') ||
      lowerInput.includes('冒险') ||
      lowerInput.includes('high risk') ||
      lowerInput.includes('maximum risk');

    let adjusted = Math.max(1, Math.min(10, riskMax));
    if (goal === 'maximize_yield' && !highRiskRequested) {
      adjusted = Math.min(adjusted, 6);
    }

    return adjusted;
  }

  private buildBridgeSteps(asset: Asset, amount: number): StrategyStep[] {
    if (asset.chain === 'ZetaChain') {
      return [];
    }
    return [
      {
        id: uuidv4(),
        type: 'bridge',
        fromChain: asset.chain,
        toChain: 'ZetaChain',
        asset: asset.symbol,
        amount,
        status: 'pending',
      },
    ];
  }

  private buildSwapStep(fromAsset: string, toAsset: string, amount: number): StrategyStep {
    return {
      id: uuidv4(),
      type: 'swap',
      fromChain: 'ZetaChain',
      toChain: 'ZetaChain',
      asset: `${fromAsset}->${toAsset}`,
      amount,
      protocol: 'ZetaSwap',
      status: 'pending',
    };
  }

  private buildDepositStep(asset: string, amount: number, protocol: string): StrategyStep {
    return {
      id: uuidv4(),
      type: 'deposit',
      fromChain: 'ZetaChain',
      toChain: 'ZetaChain',
      asset,
      amount,
      protocol,
      status: 'pending',
    };
  }

  private buildStakeStep(asset: string, amount: number, protocol: string): StrategyStep {
    return {
      id: uuidv4(),
      type: 'stake',
      fromChain: 'ZetaChain',
      toChain: 'ZetaChain',
      asset,
      amount,
      protocol,
      status: 'pending',
    };
  }
}

export const aiStrategist = new AIStrategist();

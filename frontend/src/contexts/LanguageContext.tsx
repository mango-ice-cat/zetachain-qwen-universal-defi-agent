import React, { createContext, useContext, useState, useCallback } from 'react';

type Language = 'en' | 'zh';

interface Translations {
  [key: string]: {
    en: string;
    zh: string;
  };
}

const translations: Translations = {
  // Landing Page
  'landing.tagline': {
    en: 'Powered by Zeta Network',
    zh: '由 Zeta Network 驱动',
  },
  'landing.title.1': {
    en: 'AI-Driven',
    zh: 'AI驱动的',
  },
  'landing.title.2': {
    en: 'DeFi Yield Optimization',
    zh: 'DeFi 收益优化',
  },
  'landing.description': {
    en: 'Zero-code friendly. Simply tell our AI your goals, and watch it generate, execute, and monitor cross-chain yield strategies automatically.',
    zh: '零代码友好。只需告诉AI您的目标，即可自动生成、执行和监控跨链收益策略。',
  },
  'landing.startOptimizing': {
    en: 'Start Optimizing',
    zh: '开始优化',
  },
  'landing.connecting': {
    en: 'Connecting...',
    zh: '连接中...',
  },
  'landing.learnMore': {
    en: 'Learn More',
    zh: '了解更多',
  },
  'landing.connectWallet': {
    en: 'Connect Wallet',
    zh: '连接钱包',
  },
  'landing.feature.aiStrategy': {
    en: 'AI-Powered Strategy',
    zh: 'AI智能策略',
  },
  'landing.feature.aiStrategy.desc': {
    en: 'Qwen Chain-of-Thought generates optimal yield strategies based on your preferences.',
    zh: 'Qwen思维链根据您的偏好生成最优收益策略。',
  },
  'landing.feature.crossChain': {
    en: 'Cross-Chain Execution',
    zh: '跨链执行',
  },
  'landing.feature.crossChain.desc': {
    en: 'Seamless multi-chain operations via Zeta Network with batch transaction support.',
    zh: '通过Zeta Network实现无缝多链操作，支持批量交易。',
  },
  'landing.feature.riskManagement': {
    en: 'Risk Management',
    zh: '风险管理',
  },
  'landing.feature.riskManagement.desc': {
    en: 'Real-time risk assessment and automated alerts to protect your portfolio.',
    zh: '实时风险评估和自动警报，保护您的投资组合。',
  },
  'landing.feature.yieldOptimization': {
    en: 'Yield Optimization',
    zh: '收益优化',
  },
  'landing.feature.yieldOptimization.desc': {
    en: 'Continuously optimized positions across DeFi protocols for maximum returns.',
    zh: '持续优化DeFi协议中的仓位以获得最大回报。',
  },
  'landing.coreLoop': {
    en: '3-Step Core Loop',
    zh: '三步核心循环',
  },
  'landing.coreLoop.desc': {
    en: 'From input to execution in minutes, not hours.',
    zh: '从输入到执行只需几分钟，而非几小时。',
  },
  'landing.step.input': {
    en: 'Input',
    zh: '输入',
  },
  'landing.step.input.desc': {
    en: 'Tell AI your goals',
    zh: '告诉AI您的目标',
  },
  'landing.step.strategize': {
    en: 'Strategize',
    zh: '策略',
  },
  'landing.step.strategize.desc': {
    en: 'AI generates plan',
    zh: 'AI生成计划',
  },
  'landing.step.execute': {
    en: 'Execute',
    zh: '执行',
  },
  'landing.step.execute.desc': {
    en: 'Monitor & optimize',
    zh: '监控与优化',
  },

  // Dashboard
  'dashboard.aiStrategy': {
    en: 'AI Strategy',
    zh: 'AI策略',
  },
  'dashboard.monitoring': {
    en: 'Monitoring',
    zh: '监控',
  },
  'dashboard.settings': {
    en: 'Settings',
    zh: '设置',
  },
  'dashboard.disconnect': {
    en: 'Disconnect',
    zh: '断开连接',
  },
  'dashboard.connected': {
    en: 'Connected',
    zh: '已连接',
  },
  'dashboard.balance': {
    en: 'Balance',
    zh: '余额',
  },
  'dashboard.network': {
    en: 'Network',
    zh: '网络',
  },
  'dashboard.zetaTestnet': {
    en: 'Zeta Testnet',
    zh: 'Zeta测试网',
  },
  'dashboard.wrongNetwork': {
    en: 'Wrong Network',
    zh: '网络错误',
  },
  'dashboard.switchNetwork': {
    en: 'Switch to Zeta',
    zh: '切换到Zeta',
  },
  'dashboard.strategyGenerator': {
    en: 'AI Strategy Generator',
    zh: 'AI策略生成器',
  },
  'dashboard.strategyGenerator.desc': {
    en: 'Describe your goals and let AI create an optimized yield strategy.',
    zh: '描述您的目标，让AI创建优化的收益策略。',
  },
  'dashboard.realtimeMonitoring': {
    en: 'Real-Time Monitoring',
    zh: '实时监控',
  },
  'dashboard.realtimeMonitoring.desc': {
    en: 'Track your strategy performance and manage positions.',
    zh: '跟踪策略表现并管理仓位。',
  },
  'dashboard.adjustStrategy': {
    en: 'Adjust Strategy',
    zh: '调整策略',
  },
  'dashboard.totalValue': {
    en: 'Total Value',
    zh: '总价值',
  },
  'dashboard.avgApy': {
    en: 'Avg APY',
    zh: '平均年化',
  },
  'dashboard.earnedToday': {
    en: 'Earned Today',
    zh: '今日收益',
  },
  'dashboard.status': {
    en: 'Status',
    zh: '状态',
  },
  'dashboard.active': {
    en: 'Active',
    zh: '运行中',
  },
  'dashboard.paused': {
    en: 'Paused',
    zh: '已暂停',
  },
  'dashboard.resume': {
    en: 'Resume',
    zh: '恢复',
  },
  'dashboard.pause': {
    en: 'Pause',
    zh: '暂停',
  },
  'dashboard.acrossAllPositions': {
    en: 'Across all positions',
    zh: '所有仓位',
  },
  'dashboard.autoCompounding': {
    en: 'Auto-compounding',
    zh: '自动复利',
  },
  'dashboard.portfolioAssets': {
    en: 'Portfolio Assets',
    zh: '投资组合资产',
  },
  'dashboard.noAssetsFound': {
    en: 'No assets found',
    zh: '未找到资产',
  },
  'dashboard.connectWalletToView': {
    en: 'Connect your wallet to view your portfolio',
    zh: '连接钱包以查看您的投资组合',
  },
  'dashboard.loadingAssets': {
    en: 'Loading assets...',
    zh: '加载资产中...',
  },
  'dashboard.totalAssets': {
    en: 'Total Assets',
    zh: '总资产',
  },
  'dashboard.totalValueLabel': {
    en: 'Total Value',
    zh: '总价值',
  },
  'dashboard.asset': {
    en: 'asset',
    zh: '资产',
  },
  'dashboard.assets': {
    en: 'assets',
    zh: '资产',
  },
  'dashboard.recentTransactions': {
    en: 'Recent Transactions',
    zh: '最近交易',
  },
  'dashboard.generatedStrategies': {
    en: 'Generated Strategies',
    zh: '生成的策略',
  },
  'dashboard.completed': {
    en: 'Completed',
    zh: '已完成',
  },
  'dashboard.pending': {
    en: 'Pending',
    zh: '处理中',
  },
  'dashboard.failed': {
    en: 'Failed',
    zh: '失败',
  },
  'dashboard.riskScore': {
    en: 'Risk Score',
    zh: '风险评分',
  },
  'dashboard.noActiveStrategies': {
    en: 'No active strategies. Use the chat to generate one.',
    zh: '暂无活跃策略。使用聊天功能生成一个。',
  },
  'dashboard.strategyExecutionStarted': {
    en: 'Strategy execution started successfully',
    zh: '策略执行已成功启动',
  },
  'dashboard.percentFromStart': {
    en: 'from start',
    zh: '自开始',
  },

  // Common
  'common.english': {
    en: 'English',
    zh: '英文',
  },
  'common.chinese': {
    en: '中文',
    zh: '中文',
  },

  // Wallet errors
  'wallet.notInstalled': {
    en: 'MetaMask not installed. Please install MetaMask to continue.',
    zh: 'MetaMask未安装。请安装MetaMask以继续。',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('zh');

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

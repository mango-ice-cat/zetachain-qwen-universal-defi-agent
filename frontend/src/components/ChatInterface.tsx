import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { StrategyOption } from '@shared/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onStrategyGenerated?: (strategy: any) => void;
}

const suggestedPrompts = [
  "最小化风险，稳定收益",
  "10k USDC 追求最大收益",
  "转0.01 ETH 到 BNB",
  "跨链均衡投资组合",
  "高风险高回报",
];

// Helper to map backend strategy to frontend preview format
const mapToPreviewFormat = (strategies: StrategyOption[]) => {
  if (!strategies || strategies.length === 0) return null;
  
  // Take the first strategy for preview
  const mainStrategy = strategies[0];
  
  // Try to find a secondary strategy or use a placeholder
  const secondaryStrategy = strategies.length > 1 ? strategies[1] : {
    id: 'sec', label: '备选方案', expectedYield: 0, actions: 'hold'
  };

  return {
    primary: { 
      name: mainStrategy.label, 
      protocol: mainStrategy.steps[0]?.protocol || '通用协议', 
      apy: mainStrategy.expectedYield, 
      allocation: 60 
    },
    secondary: { 
      name: secondaryStrategy.label || '辅助策略', 
      protocol: 'Zeta Earn', // Mock
      apy: (secondaryStrategy.expectedYield || 0), 
      allocation: 30 
    },
    hedge: { name: 'USDC 储备', allocation: 10 },
    riskLevel: mainStrategy.riskScore <= 3 ? 'low' : mainStrategy.riskScore <= 7 ? 'medium' : 'high',
    expectedYield: { 
      min: Math.max(0, mainStrategy.expectedYield - 2), 
      max: mainStrategy.expectedYield + 2 
    }
  };
};

export const ChatInterface = ({ onStrategyGenerated }: ChatInterfaceProps) => {
  const { generateStrategies, isLoading } = useStore();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 欢迎使用 ZetaYield AI！我是您的 DeFi 优化助手。告诉我您的投资目标、风险承受能力和初始资产，我将为您生成最佳收益策略。\n\n例如：“我有 10k USDC，想要中等风险，追求最大收益。”",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    try {
      const result = await generateStrategies(currentInput);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      
      if (onStrategyGenerated && result.strategies) {
        const previewData = mapToPreviewFormat(result.strategies);
        if (previewData) {
          onStrategyGenerated(previewData);
        }
      }
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error generating strategies. Please ensure the backend is running.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card variant="glass" className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-gradient-to-br from-primary/20 to-accent/20'
              }`}>
                {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-secondary rounded-tl-sm'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <span className="text-[10px] opacity-60 mt-1 block">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-1">
                <motion.span
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                />
                <motion.span
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                />
                <motion.span
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      <div className="px-4 pb-2">
        <p className="text-xs text-muted-foreground mb-2">建议提示词：</p>
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setInput(prompt)}
              className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="描述您的收益优化目标..."
              className="w-full bg-secondary rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <Button 
            variant="gradient" 
            size="icon" 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </Card>
  );
};

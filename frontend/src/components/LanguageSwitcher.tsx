import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <motion.button
      onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
      className="flex items-center gap-2 px-3 py-2 rounded-lg glass hover:bg-secondary/50 transition-colors"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Globe className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium">
        {language === 'en' ? '中文' : 'EN'}
      </span>
    </motion.button>
  );
};

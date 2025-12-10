'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/language-context';
import { Globe } from 'lucide-react';

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLanguage = language === 'en' ? 'ar' : 'en';
    setLanguage(newLanguage);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center"
      aria-label={`Switch to ${language === 'en' ? 'Arabic' : 'English'}`}
    >
      <Globe className="w-4 h-4 mr-2" />
      {language.toUpperCase()}
    </Button>
  );
};

export default LanguageSelector;

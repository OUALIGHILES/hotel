'use client';

import { LanguageProvider } from '@/lib/language-context';
import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </ThemeProvider>
  );
}
import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { storage } from '../services/storage';

interface LanguageContextType {
  language: string;
  changeLanguage: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'English',
  changeLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState('English');

  useEffect(() => {
    storage.getLanguage().then(l => setLang(l));
  }, []);

  const changeLanguage = useCallback((newLang: string) => {
    setLang(newLang);
    storage.setLanguage(newLang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

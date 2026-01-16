"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, translations } from "./translations";

type Translation = typeof translations[Language];

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translation;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: React.ReactNode;
  initialLanguage?: Language;
}

export function I18nProvider({
  children,
  initialLanguage = "en",
}: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("language", lang);
      document.cookie = `language=${lang}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = lang;
    }
  };

  useEffect(() => {
    const cookieMatch = document.cookie.match(/(?:^|; )language=([^;]+)/);
    const cookieLang = cookieMatch?.[1] as Language | undefined;
    const saved = localStorage.getItem("language") as Language | null;

    if (cookieLang === "en" || cookieLang === "ko") {
      setLanguageState(cookieLang);
      localStorage.setItem("language", cookieLang);
      document.documentElement.lang = cookieLang;
      return;
    }

    if (saved === "en" || saved === "ko") {
      setLanguageState(saved);
      document.cookie = `language=${saved}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = saved;
    } else {
      document.documentElement.lang = language;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = translations[language] as Translation;

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}


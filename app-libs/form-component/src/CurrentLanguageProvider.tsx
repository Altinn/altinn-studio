import { createContext, type PropsWithChildren, useContext } from 'react';

/**
 * The currently active language code (e.g. `nb`, `nn`, `en`). This is app-global state — it is the
 * same for the entire app and only changes via URL/cookie/profile — so it is provided once near the
 * app root, unlike the per-component translation functions in {@link LanguageTranslatorProvider}.
 */
const CurrentLanguageContext = createContext<string>('nb');

export function CurrentLanguageProvider({
  currentLanguage,
  children,
}: PropsWithChildren<{ currentLanguage: string }>) {
  return (
    <CurrentLanguageContext.Provider value={currentLanguage}>
      {children}
    </CurrentLanguageContext.Provider>
  );
}

/** Returns the currently active language code provided by {@link CurrentLanguageProvider}. */
export function useCurrentLanguage(): string {
  return useContext(CurrentLanguageContext);
}

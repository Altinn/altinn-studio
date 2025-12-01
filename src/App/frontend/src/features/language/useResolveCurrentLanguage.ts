import { getLang } from 'src/language/globalStateLoader';

/**
 * Determines the current language based on the user's preferences and what the app has available
 * Moved to languageLoader.tsx,kept for compatibility temporarily
 */
export function useResolveCurrentLanguage(
  appLanguages: string[] | undefined,
  {
    languageFromSelector,
    languageFromUrl,
    languageFromProfile,
  }: {
    languageFromSelector?: string | null;
    languageFromUrl?: string | null;
    languageFromProfile?: string | null;
  },
): string {
  return getLang(appLanguages, {
    languageFromSelector,
    languageFromUrl,
    languageFromProfile,
  });
}

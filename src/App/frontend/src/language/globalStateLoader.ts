import type { LoaderFunctionArgs } from 'react-router-dom';

import type { QueryClient } from '@tanstack/react-query';

interface LanguageLoaderProps extends LoaderFunctionArgs {
  context: {
    queryClient: QueryClient;
  };
}

export function getLang(
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
  // We don't know what languages the app has available yet, so we just use whatever the user wants for now
  if (!appLanguages) {
    return languageFromSelector ?? languageFromUrl ?? languageFromProfile ?? 'nb';
  }

  // Try to fulfill the user's preferences in order of priority

  if (languageFromSelector) {
    if (appLanguages.includes(languageFromSelector)) {
      return languageFromSelector;
    }
    window.logWarnOnce(
      `User's preferred language (${languageFromSelector}) from language selector / localstorage is not supported by the app, supported languages: [${appLanguages.join(', ')}]`,
    );
  }

  if (languageFromUrl) {
    if (appLanguages.includes(languageFromUrl)) {
      return languageFromUrl;
    }
    window.logWarnOnce(
      `User's preferred language from query parameter (lang=${languageFromUrl}) is not supported by the app, supported languages: [${appLanguages.join(', ')}]`,
    );
  }

  if (languageFromProfile) {
    if (appLanguages.includes(languageFromProfile)) {
      return languageFromProfile;
    }
    window.logInfoOnce(
      `User's preferred language (${languageFromProfile}) from Altinn profile is not supported by the app, supported languages: [${appLanguages.join(', ')}]`,
    );
  }

  // The user has no valid preference, try to fall back to one of the standard languages that the app supports

  if (appLanguages.includes('nb')) {
    return 'nb';
  }
  if (appLanguages.includes('nn')) {
    return 'nn';
  }
  if (appLanguages.includes('en')) {
    return 'en';
  }

  // None of the standard languages are supported, try the first supported language

  if (appLanguages.length) {
    return appLanguages[0];
  }

  // The app has not defined any languages, something is probably wrong

  window.logErrorOnce('When fetching app languages the app returned 0 languages');

  return 'nb';
}

export async function globalStateLoader({ context, params }: LanguageLoaderProps): Promise<unknown> {
  const { queryClient } = context;
  console.log('params', params);

  // const { org, app } = params;
  // Seed available languages from window data
  // queryClient.setQueryData(['fetchAppLanguages'], window.AltinnAppGlobalData.availableLanguages);

  // const profile = window.AltinnAppGlobalData.userProfile;
  //
  // const bootstrapText = window.AltinnAppData.textResources;
  // const bootstrapLang = bootstrapText.language;
  // const languageFromUrl = getLanguageFromUrl();
  // const languageFromProfile = profile?.profileSettingPreference.language;
  // const raw = localStorage.getItem(`${org}/${app}/${profile.userId}/selectedLanguage`);
  // const languageFromSelector = raw ? JSON.parse(raw) : null;
  //
  // const currentLangString = getLang(
  //   window.AltinnAppData.availableLanguages.map((lang) => lang.language),
  //   {
  //     languageFromSelector,
  //     languageFromUrl,
  //     languageFromProfile,
  //   },
  // );
  //
  // queryClient.setQueryData<TextResourceMap>(['fetchTextResources', bootstrapLang], convertResult(bootstrapText));
  //
  // if (currentLangString && currentLangString !== bootstrapLang) {
  //   await queryClient.ensureQueryData<TextResourceMap>({
  //     queryKey: ['fetchTextResources', currentLangString],
  //     queryFn: async () => convertResult(await fetchTextResources(currentLangString)),
  //   });
  // }

  return null;
}

export function createGlobalDataLoader(context: LanguageLoaderProps['context']) {
  return (args: LoaderFunctionArgs) => globalStateLoader({ ...args, context });
}

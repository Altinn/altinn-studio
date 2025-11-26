import type { LoaderFunctionArgs } from 'react-router-dom';

import type { QueryClient } from '@tanstack/react-query';

interface LanguageLoaderProps extends LoaderFunctionArgs {
  context: {
    queryClient: QueryClient;
  };
}

export async function languageLoader({ context }): Promise<unknown> {
  const { queryClient } = context;
  console.log('🔴 LANGUAGE LOADER: Setting availableLanguages from HTML:', window.AltinnAppData.availableLanguages);
  console.log('🔴 LANGUAGE LOADER: textResources in HTML:', window.AltinnAppData.textResources);
  queryClient.setQueryData(['fetchAppLanguages'], window.AltinnAppData.availableLanguages);
  queryClient.setQueryData(['fetchTextResources'], window.AltinnAppData?.textResources);
  return null;
}

export function createLanguageLoader(context: LanguageLoaderProps['context']) {
  return (args: LoaderFunctionArgs) => languageLoader({ ...args, context });
}

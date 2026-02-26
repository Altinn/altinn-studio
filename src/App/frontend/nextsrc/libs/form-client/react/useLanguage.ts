import { useCallback } from 'react';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { resolveTextResource } from 'nextsrc/libs/form-client/stores/textResourceStore';
import { useStore } from 'zustand';

import { getLanguageFromCode } from 'src/language/languages';

export interface UseLanguageResult {
  langAsString: (key: string | undefined, params?: (string | number)[]) => string;
}

export function useLanguage(): UseLanguageResult {
  const client = useFormClient();
  const resources = useStore(client.textResourceStore, (state) => state.resources);
  const language = useStore(client.textResourceStore, (state) => state.language);

  // Read form data lazily inside langAsString instead of subscribing to it.
  // Text resources that use dataModel variables will resolve with the current
  // value at call time. This avoids re-rendering every component on every
  // form data change.
  const langAsString = useCallback(
    (key: string | undefined, params?: (string | number)[]): string => {
      if (!key) {
        return '';
      }

      const appResolved = resolveTextResource(key, resources, client.textResourceDataSources);
      if (appResolved !== key) {
        return appResolved;
      }

      const systemLanguage = getLanguageFromCode(language);
      const systemValue = (systemLanguage as Record<string, string>)[key];
      if (typeof systemValue === 'string') {
        return params ? replaceParameters(systemValue, params) : systemValue;
      }

      return key;
    },
    [resources, language, client],
  );

  return { langAsString };
}

function replaceParameters(text: string, params: (string | number)[]): string {
  let out = text;
  for (const index in params) {
    out = out.replaceAll(`{${index}}`, String(params[index]));
  }
  return out;
}

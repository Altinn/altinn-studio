import { useMemo } from 'react';
import { useStore } from 'zustand';

import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { resolveTextResource } from 'nextsrc/libs/form-client/stores/textResourceStore';
import { getLanguageFromCode } from 'src/language/languages';

export interface UseLanguageResult {
  langAsString: (key: string | undefined, params?: (string | number)[]) => string;
}

export function useLanguage(): UseLanguageResult {
  const client = useFormClient();
  const resources = useStore(client.textResourceStore, (state) => state.resources);
  const language = useStore(client.textResourceStore, (state) => state.language);
  const formData = useStore(client.formDataStore, (state) => state.data);

  return useMemo(() => {
    const systemLanguage = getLanguageFromCode(language);

    function langAsString(key: string | undefined, params?: (string | number)[]): string {
      if (!key) {
        return '';
      }

      const appResolved = resolveTextResource(key, resources, client.textResourceDataSources);
      if (appResolved !== key) {
        return appResolved;
      }

      const systemValue = (systemLanguage as Record<string, string>)[key];
      if (typeof systemValue === 'string') {
        return params ? replaceParameters(systemValue, params) : systemValue;
      }

      return key;
    }

    return { langAsString };
  }, [resources, language, formData, client]);
}

function replaceParameters(text: string, params: (string | number)[]): string {
  let out = text;
  for (const index in params) {
    out = out.replaceAll(`{${index}}`, String(params[index]));
  }
  return out;
}

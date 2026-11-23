import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { TextsById } from '../types';

// The app's name is the same in every language until it is translated.
const textsKeptOnAdd = ['appName', 'ServiceName'];

export type AddLanguageArgs = {
  language: string;
  /** The texts of the main language, whose keys the new language gets with empty values. */
  mainTexts: TextsById;
};

/**
 * Adds a text file for the language, so the app offers it. Like the text editor, it lists every text
 * with an empty value, since the backend does not take an empty file.
 */
export const useAddLanguageMutation = (org: string, app: string) => {
  const { addLanguageCode } = useServicesContext();
  const invalidateTexts = useInvalidateTexts(org, app);
  return useMutation({
    mutationFn: ({ language, mainTexts }: AddLanguageArgs) =>
      addLanguageCode(org, app, language, {
        language,
        resources: Object.entries(mainTexts).map(([id, value]) => ({
          id,
          value: textsKeptOnAdd.includes(id) ? value : '',
        })),
      }),
    onSettled: invalidateTexts,
  });
};

/** Deletes the language's text file and with it every text in the language. */
export const useDeleteLanguageMutation = (org: string, app: string) => {
  const { deleteLanguageCode } = useServicesContext();
  const invalidateTexts = useInvalidateTexts(org, app);
  return useMutation({
    mutationFn: (language: string) => deleteLanguageCode(org, app, language),
    onSettled: invalidateTexts,
  });
};

const useInvalidateTexts = (org: string, app: string) => {
  const queryClient = useQueryClient();
  return async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [QueryKey.TextLanguages, org, app] });
    await queryClient.invalidateQueries({ queryKey: [QueryKey.TextResources, org, app] });
  };
};

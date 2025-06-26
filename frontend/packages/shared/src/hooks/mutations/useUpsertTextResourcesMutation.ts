import type { ITextResource, ITextResources, ITextResourcesWithLanguage } from '../../types/global';
import type { DefaultError, UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { setTextResourcesForLanguage, updateEntireLanguage } from '../../utils/textResourceUtils';
import { usePreviewConnection } from 'app-shared/providers/PreviewConnectionContext';
import { TextResourceUtils } from '@studio/pure-functions';

export interface UpsertTextResourcesMutationArgs {
  language: string;
  textResources: ITextResource[];
}

export type UseUpsertTextResourceMutationResult = UseMutationResult<
  ITextResourcesWithLanguage,
  DefaultError,
  UpsertTextResourcesMutationArgs
>;

export const useUpsertTextResourcesMutation = (
  org: string,
  app: string,
): UseUpsertTextResourceMutationResult => {
  const previewConnection = usePreviewConnection();
  const { upsertTextResources } = useServicesContext();
  const queryClient = useQueryClient();
  const queryKey = [QueryKey.TextResources, org, app];
  return useMutation<ITextResourcesWithLanguage, DefaultError, UpsertTextResourcesMutationArgs>({
    mutationFn: ({
      language,
      textResources,
    }: UpsertTextResourcesMutationArgs): Promise<ITextResourcesWithLanguage> =>
      upsertTextResources(
        org,
        app,
        language,
        TextResourceUtils.fromArray(textResources).toObject(),
      ),
    onMutate: ({ language, textResources }: UpsertTextResourcesMutationArgs): void => {
      queryClient.setQueryData<ITextResources>(
        queryKey,
        (oldTexts: ITextResources): ITextResources =>
          setTextResourcesForLanguage(oldTexts, language, textResources),
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey }),
    onSuccess: async (response: ITextResourcesWithLanguage): Promise<void> => {
      if (previewConnection && previewConnection.state === 'Connected') {
        await previewConnection.send('sendMessage', 'reload-layouts').catch(function (err) {
          return console.error(err.toString());
        });
      }
      queryClient.setQueryData(
        queryKey,
        (oldTexts: ITextResources): ITextResources => updateEntireLanguage(oldTexts, response),
      );
    },
  });
};

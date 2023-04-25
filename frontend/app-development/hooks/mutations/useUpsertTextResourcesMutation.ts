import { ITextResource, ITextResources } from 'app-shared/types/global';
import { useMutation } from '@tanstack/react-query';
import { queryClient, useServicesContext } from '../../common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';
import { convertTextResourcesArrayToObject, modifyTextResources } from 'app-shared/utils/textResourceUtils';

export interface UpsertTextResourcesMutationArgs {
  language: string;
  textResources: ITextResource[];
}

export const useUpsertTextResourcesMutation = (org: string, app: string) => {
  const { upsertTextResources } = useServicesContext();
  return useMutation({
    mutationFn: ({ language, textResources }: UpsertTextResourcesMutationArgs) =>
      upsertTextResources(
        org,
        app,
        language,
        convertTextResourcesArrayToObject(textResources)
      ).then(() => ({ language, textResources })),
    onSuccess: ({ language, textResources }: UpsertTextResourcesMutationArgs) => {
      queryClient.setQueryData(
        [QueryKey.TextResources, org, app],
        (oldTexts: ITextResources): ITextResources => modifyTextResources(oldTexts, language, textResources)
      )
    }
  });
};

import { useMutation } from '@tanstack/react-query';
import { ILayoutSettings } from 'app-shared/types/global';
import { queryClient, useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';

export const useFormLayoutSettingsMutation = (org: string, app: string) => {
  const { saveFormLayoutSettings } = useServicesContext();
  return useMutation({
    mutationFn: (settings: ILayoutSettings) => saveFormLayoutSettings(org, app, settings).then(() => settings),
    onSuccess: (savedSettings) => {
      queryClient.setQueryData(
        [QueryKey.FormLayoutSettings, org, app],
        savedSettings
      );
    }
  });
}

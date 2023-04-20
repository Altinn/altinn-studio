import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';
import { ILayoutSettings } from 'app-shared/types/global';

export const useFormLayoutSettingsQuery =
  (org: string, app: string): UseQueryResult<ILayoutSettings> => {
    const { getFormLayoutSettings } = useServicesContext();
    return useQuery<ILayoutSettings>(
      [QueryKey.FormLayoutSettings, org, app],
      () => getFormLayoutSettings(org, app),
    );
  };

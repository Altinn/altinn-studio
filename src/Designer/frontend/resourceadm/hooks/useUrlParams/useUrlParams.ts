import { useParams } from 'react-router-dom';
import { getAppName } from '../../utils/stringUtils';

interface ResourceAdminUrlParams {
  org: string;
  app: string;
  env?: string;
  resourceId?: string;
  accessListId?: string;
  pageType?: string;
}

export const useUrlParams = (): Readonly<ResourceAdminUrlParams> => {
  const params = useParams();

  return {
    org: params.org,
    app: getAppName(params.org),
    env: params.env,
    resourceId: params.resourceId,
    accessListId: params.accessListId,
    pageType: params.pageType,
  };
};

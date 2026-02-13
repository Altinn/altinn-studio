import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata';
import { getUiFolderSettings } from 'src/features/form/layoutSets';

export const useAllowAnonymous = () => {
  const isStateless = useIsStateless();

  if (!isStateless) {
    return false;
  }

  const application = getApplicationMetadata();
  const dataTypeId = getUiFolderSettings(application.onEntry.show)?.defaultDataType;
  const dataType = application.dataTypes.find((d) => d.id === dataTypeId);
  const allowAnonymous = dataType?.appLogic?.allowAnonymousOnStateless;
  if (allowAnonymous !== undefined && allowAnonymous !== null) {
    return allowAnonymous;
  }

  return false;
};

export const useIsAllowAnonymous = (compareWith: boolean) => {
  const allowAnonymous = useAllowAnonymous();
  return allowAnonymous === compareWith;
};

import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata';
import { getUiFolders } from 'src/features/form/layoutSets';
import { getDataTypeByUiFolderId } from 'src/features/instance/instanceUtils';

export const useAllowAnonymous = () => {
  const isStateless = useIsStateless();

  if (!isStateless) {
    return false;
  }

  const application = getApplicationMetadata();
  const uiFolders = getUiFolders();

  const dataTypeId = getDataTypeByUiFolderId({
    uiFolderId: application.onEntry.show,
    uiFolders,
  });
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

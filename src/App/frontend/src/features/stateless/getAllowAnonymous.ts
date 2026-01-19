import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata';
import { getDataTypeByLayoutSetId } from 'src/features/instance/instanceUtils';
import { getLayoutSets } from 'src/features/layoutSets';

export const useAllowAnonymous = () => {
  const isStateless = useIsStateless();

  if (!isStateless) {
    return false;
  }

  const application = getApplicationMetadata();
  const layoutSets = getLayoutSets();

  const dataTypeId = getDataTypeByLayoutSetId({
    layoutSetId: application.onEntry.show,
    layoutSets,
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

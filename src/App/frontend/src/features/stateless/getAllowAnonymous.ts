import { getApplicationMetadata, useIsStatelessApp } from 'src/domain/ApplicationMetadata/getApplicationMetadata';
import { useLayoutSetsQuery } from 'src/domain/Layout/layoutSetsQuery';
import { getDataTypeByLayoutSetId } from 'src/features/applicationMetadata/appMetadataUtils';

export const useAllowAnonymous = () => {
  const application = getApplicationMetadata();
  const isStatelessApp = useIsStatelessApp();
  const { data: layoutSets } = useLayoutSetsQuery();

  if (!layoutSets || !isStatelessApp) {
    return false;
  }

  const dataTypeId = getDataTypeByLayoutSetId({
    layoutSetId: application.onEntry?.show,
    layoutSets: layoutSets.sets,
    appMetaData: application,
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

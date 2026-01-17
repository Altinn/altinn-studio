import { getApplicationMetadata, useIsStateless } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useLayoutSetsQuery } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { getDataTypeByLayoutSetId } from 'src/features/instance/instanceUtils';

export const useAllowAnonymous = () => {
  const application = getApplicationMetadata();
  const isStateless = useIsStateless();
  const { data: layoutSets } = useLayoutSetsQuery();

  if (!layoutSets || !isStateless) {
    return false;
  }

  const dataTypeId = getDataTypeByLayoutSetId({
    layoutSetId: application.onEntry.show,
    layoutSets: layoutSets.sets,
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

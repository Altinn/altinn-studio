import { ContextNotProvided } from 'src/core/contexts/context';
import { useLaxApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { getDataTypeByLayoutSetId } from 'src/features/applicationMetadata/appMetadataUtils';
import { useLayoutSetsQuery } from 'src/features/form/layoutSets/LayoutSetsProvider';

export const useAllowAnonymous = () => {
  const application = useLaxApplicationMetadata();
  const { data: layoutSets } = useLayoutSetsQuery();

  if (!layoutSets || application === ContextNotProvided || !application.isStatelessApp) {
    return false;
  }

  const dataTypeId = getDataTypeByLayoutSetId({
    layoutSetId: application.onEntry.show,
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

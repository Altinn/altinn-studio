import { useAppMetadataQuery } from 'app-shared/hooks/queries';
import type { DataTypeElement } from 'app-shared/types/ApplicationMetadata';
import { useGetLayoutSetByName } from './useGetLayoutSetByName';

type UseGetBindableDataTypesReturn = {
  defaultDataTypeName: string;
  bindableDataTypes: DataTypeElement[];
};

export const useGetBindableDataTypes = (
  org: string,
  app: string,
  layoutSetName: string,
): UseGetBindableDataTypesReturn => {
  const { data: appMetadata } = useAppMetadataQuery(org, app);
  const layoutSet = useGetLayoutSetByName({ org, app, name: layoutSetName });
  const defaultDataTypeName = layoutSet?.dataType;

  const bindableDataTypes = appMetadata.dataTypes.filter(
    (dataType) =>
      dataType.appLogic && dataType.maxCount === 1 && dataType.id !== defaultDataTypeName,
  );
  return { defaultDataTypeName, bindableDataTypes };
};

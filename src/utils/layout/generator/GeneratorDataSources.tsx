import { createHookContext } from 'src/core/contexts/hookContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { useLaxInstanceDataSources } from 'src/features/instance/InstanceContext';

const { Provider, hooks } = createHookContext({
  useLaxInstanceDataSources: () => useLaxInstanceDataSources(),
  useDefaultDataType: () => DataModels.useDefaultDataType(),
  useReadableDataTypes: () => DataModels.useReadableDataTypes(),
  useExternalApis: () => useExternalApis(useApplicationMetadata().externalApiIds ?? []),
  useGetDataElementIdForDataType: () => DataModels.useGetDataElementIdForDataType(),
});

export const GeneratorData = {
  Provider,
  useDefaultDataType: hooks.useDefaultDataType,
  useGetDataElementIdForDataType: hooks.useGetDataElementIdForDataType,
  useLaxInstanceDataSources: hooks.useLaxInstanceDataSources,
  useReadableDataTypes: hooks.useReadableDataTypes,
  useExternalApis: hooks.useExternalApis,
};

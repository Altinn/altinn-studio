import { createHookContext } from 'src/core/contexts/hookContext';
import { getApplicationMetadata } from 'src/domain/ApplicationMetadata/getApplicationMetadata';
import { useInstanceDataSources } from 'src/domain/Instance/useInstanceQuery';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';

const { Provider, hooks } = createHookContext({
  useLaxInstanceDataSources: () => useInstanceDataSources(),
  useDefaultDataType: () => DataModels.useDefaultDataType(),
  useReadableDataTypes: () => DataModels.useReadableDataTypes(),
  useExternalApis: () => useExternalApis(getApplicationMetadata().externalApiIds ?? []),
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

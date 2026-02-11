import { createHookContext } from 'src/core/contexts/hookContext';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { useInstanceDataSources } from 'src/features/instance/InstanceContext';

const { Provider, hooks } = createHookContext({
  useLaxInstanceDataSources: () => useInstanceDataSources(),
  useExternalApis: () => useExternalApis(getApplicationMetadata().externalApiIds ?? []),
  useGetDataElementIdForDataType: () => DataModels.useGetDataElementIdForDataType(),
});

export const GeneratorData = {
  Provider,
  useGetDataElementIdForDataType: hooks.useGetDataElementIdForDataType,
  useLaxInstanceDataSources: hooks.useLaxInstanceDataSources,
  useExternalApis: hooks.useExternalApis,
};

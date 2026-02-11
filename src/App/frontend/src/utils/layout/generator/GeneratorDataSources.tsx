import { createHookContext } from 'src/core/contexts/hookContext';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrapProvider';
import { useInstanceDataSources } from 'src/features/instance/InstanceContext';

const { Provider, hooks } = createHookContext({
  useLaxInstanceDataSources: () => useInstanceDataSources(),
  useExternalApis: () => useExternalApis(getApplicationMetadata().externalApiIds ?? []),
  useGetDataElementIdForDataType: () => FormBootstrap.useGetDataElementIdForDataType(),
});

export const GeneratorData = {
  Provider,
  useGetDataElementIdForDataType: hooks.useGetDataElementIdForDataType,
  useLaxInstanceDataSources: hooks.useLaxInstanceDataSources,
  useExternalApis: hooks.useExternalApis,
};

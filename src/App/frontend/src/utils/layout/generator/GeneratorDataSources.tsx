import { createHookContext } from 'src/core/contexts/hookContext';
import { getApplicationMetadata } from 'src/features/applicationMetadata';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { useInstanceDataSources } from 'src/features/instance/InstanceContext';

const { Provider, hooks } = createHookContext({
  useLaxInstanceDataSources: () => useInstanceDataSources(),
  useExternalApis: () => useExternalApis(getApplicationMetadata().externalApiIds ?? []),
});

export const GeneratorData = {
  Provider,
  useLaxInstanceDataSources: hooks.useLaxInstanceDataSources,
  useExternalApis: hooks.useExternalApis,
};

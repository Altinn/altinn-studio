import { createHookContext } from 'src/core/contexts/hookContext';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { useCurrentLayoutSet } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { useLaxInstanceDataSources } from 'src/features/instance/InstanceContext';
import { useCommitWhenFinished } from 'src/utils/layout/generator/CommitQueue';

const { Provider, hooks } = createHookContext({
  useLaxInstanceDataSources: () => useLaxInstanceDataSources(),
  useCurrentLayoutSet: () => useCurrentLayoutSet(),
  useDefaultDataType: () => DataModels.useDefaultDataType(),
  useReadableDataTypes: () => DataModels.useReadableDataTypes(),
  useExternalApis: () => useExternalApis(useApplicationMetadata().externalApiIds ?? []),
  useGetDataElementIdForDataType: () => DataModels.useGetDataElementIdForDataType(),
  useCommitWhenFinished: () => useCommitWhenFinished(),
});

export const GeneratorData = {
  Provider,
  useDefaultDataType: hooks.useDefaultDataType,
  useGetDataElementIdForDataType: hooks.useGetDataElementIdForDataType,
  useCommitWhenFinished: hooks.useCommitWhenFinished,
  useLaxInstanceDataSources: hooks.useLaxInstanceDataSources,
  useCurrentLayoutSet: hooks.useCurrentLayoutSet,
  useReadableDataTypes: hooks.useReadableDataTypes,
  useExternalApis: hooks.useExternalApis,
};

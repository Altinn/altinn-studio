import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useCurrentLayoutSet } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxDataElementsSelectorProps, useLaxInstanceDataSources } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useInnerLanguageWithForcedNodeSelector } from 'src/features/language/useLanguage';
import { useCodeListSelectorProps } from 'src/features/options/CodeListsProvider';
import { useMultipleDelayedSelectors } from 'src/hooks/delayedSelectors';
import { useShallowMemo } from 'src/hooks/useShallowMemo';
import { useCurrentDataModelLocation } from 'src/utils/layout/DataModelLocation';
import { Hidden, NodesInternal } from 'src/utils/layout/NodesContext';
import { useInnerDataModelBindingTranspose } from 'src/utils/layout/useDataModelBindingTranspose';
import type { AttachmentsSelector } from 'src/features/attachments/tools';
import type { ExternalApisResult } from 'src/features/externalApi/useExternalApi';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { DataElementSelector } from 'src/features/instance/InstanceContext';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { CodeListSelector } from 'src/features/options/CodeListsProvider';
import type { NodeOptionsSelector } from 'src/features/options/OptionsStorePlugin';
import type { FormDataRowsSelector, FormDataSelector } from 'src/layout';
import type { IDataModelReference, ILayoutSet } from 'src/layout/common.generated';
import type { IApplicationSettings, IInstanceDataSources, IProcess } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';
import type { DataModelTransposeSelector } from 'src/utils/layout/useDataModelBindingTranspose';

export interface ExpressionDataSources {
  process?: IProcess;
  instanceDataSources: IInstanceDataSources | null;
  applicationSettings: IApplicationSettings | null;
  dataElementSelector: DataElementSelector;
  dataModelNames: string[];
  formDataSelector: FormDataSelector;
  formDataRowsSelector: FormDataRowsSelector;
  attachmentsSelector: AttachmentsSelector;
  optionsSelector: NodeOptionsSelector;
  langToolsSelector: (node: LayoutNode | string | undefined) => IUseLanguage;
  currentLanguage: string;
  currentLayoutSet: ILayoutSet | null;
  isHiddenSelector: ReturnType<typeof Hidden.useIsHiddenSelector>;
  nodeDataSelector: NodeDataSelector;
  transposeSelector: DataModelTransposeSelector;
  externalApis: ExternalApisResult;
  currentDataModelPath: IDataModelReference | undefined;
  codeListSelector: CodeListSelector;
  layoutLookups: LayoutLookups;
}

export function useExpressionDataSources(): ExpressionDataSources {
  const [
    formDataSelector,
    formDataRowsSelector,
    attachmentsSelector,
    optionsSelector,
    nodeDataSelector,
    isHiddenSelector,
    dataElementSelector,
    codeListSelector,
  ] = useMultipleDelayedSelectors(
    FD.useDebouncedSelectorProps(),
    FD.useDebouncedRowsSelectorProps(),
    NodesInternal.useAttachmentsSelectorProps(),
    NodesInternal.useNodeOptionsSelectorProps(),
    NodesInternal.useNodeDataSelectorProps(),
    Hidden.useIsHiddenSelectorProps(),
    useLaxDataElementsSelectorProps(),
    useCodeListSelectorProps(),
  );

  const process = useLaxProcessData();
  const applicationSettings = useApplicationSettings();
  const currentLanguage = useCurrentLanguage();
  const currentDataModelPath = useCurrentDataModelLocation();
  const layoutLookups = useLayoutLookups();
  const instanceDataSources = useLaxInstanceDataSources();
  const currentLayoutSet = useCurrentLayoutSet() ?? null;
  const dataModelNames = DataModels.useReadableDataTypes();
  const externalApis = useExternalApis(useApplicationMetadata().externalApiIds ?? []);
  const transposeSelector = useInnerDataModelBindingTranspose(nodeDataSelector);
  const langToolsSelector = useInnerLanguageWithForcedNodeSelector(
    DataModels.useDefaultDataType(),
    dataModelNames,
    formDataSelector,
    nodeDataSelector,
  );

  return useShallowMemo({
    formDataSelector,
    formDataRowsSelector,
    attachmentsSelector,
    optionsSelector,
    nodeDataSelector,
    process,
    applicationSettings,
    instanceDataSources,
    langToolsSelector,
    currentLanguage,
    isHiddenSelector,
    transposeSelector,
    currentLayoutSet,
    externalApis,
    dataModelNames,
    dataElementSelector,
    codeListSelector,
    currentDataModelPath,
    layoutLookups,
  });
}

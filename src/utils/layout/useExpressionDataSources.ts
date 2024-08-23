import { useMemo } from 'react';

import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { useApplicationSettings } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { useAttachmentsSelector } from 'src/features/attachments/hooks';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useExternalApis } from 'src/features/externalApi/useExternalApi';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstanceDataSources } from 'src/features/instance/InstanceContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguageWithForcedNodeSelector } from 'src/features/language/useLanguage';
import { useNodeOptionsSelector } from 'src/features/options/useNodeOptions';
import { buildAuthContext } from 'src/utils/authContext';
import { Hidden, NodesInternal } from 'src/utils/layout/NodesContext';
import { useDataModelBindingTranspose } from 'src/utils/layout/useDataModelBindingTranspose';
import { useNodeFormDataSelector } from 'src/utils/layout/useNodeItem';
import { useNodeTraversalSelectorLax } from 'src/utils/layout/useNodeTraversal';
import type { AttachmentsSelector } from 'src/features/attachments/AttachmentsStorePlugin';
import type { DevToolsHiddenComponents } from 'src/features/devtools/data/types';
import type { ExternalApisResult } from 'src/features/externalApi/useExternalApi';
import type { IUseLanguage } from 'src/features/language/useLanguage';
import type { NodeOptionsSelector } from 'src/features/options/OptionsStorePlugin';
import type { FormDataRowsSelector, FormDataSelector } from 'src/layout';
import type { ILayoutSettings } from 'src/layout/common.generated';
import type { IApplicationSettings, IAuthContext, IInstanceDataSources, IProcess } from 'src/types/shared';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';
import type { DataModelTransposeSelector } from 'src/utils/layout/useDataModelBindingTranspose';
import type { NodeFormDataSelector } from 'src/utils/layout/useNodeItem';
import type { NodeTraversalSelectorLax } from 'src/utils/layout/useNodeTraversal';

export interface ExpressionDataSources {
  process?: IProcess;
  instanceDataSources: IInstanceDataSources | null;
  applicationSettings: IApplicationSettings | null;
  formDataSelector: FormDataSelector;
  formDataRowsSelector: FormDataRowsSelector;
  attachmentsSelector: AttachmentsSelector;
  layoutSettings: ILayoutSettings;
  optionsSelector: NodeOptionsSelector;
  authContext: Partial<IAuthContext> | null;
  langToolsSelector: (node: LayoutNode | undefined) => IUseLanguage;
  currentLanguage: string;
  isHiddenSelector: ReturnType<typeof Hidden.useIsHiddenSelector>;
  nodeFormDataSelector: NodeFormDataSelector;
  nodeDataSelector: NodeDataSelector;
  nodeTraversal: NodeTraversalSelectorLax;
  transposeSelector: DataModelTransposeSelector;
  devToolsIsOpen: boolean;
  devToolsHiddenComponents: DevToolsHiddenComponents;
  externalApis: ExternalApisResult;
}

export function useExpressionDataSources(): ExpressionDataSources {
  const instanceDataSources = useLaxInstanceDataSources();
  const formDataSelector = FD.useDebouncedSelector();
  const formDataRowsSelector = FD.useDebouncedRowsSelector();
  const layoutSettings = useLayoutSettings();
  const attachmentsSelector = useAttachmentsSelector();
  const optionsSelector = useNodeOptionsSelector();
  const process = useLaxProcessData();
  const applicationSettings = useApplicationSettings();
  const devToolsIsOpen = useDevToolsStore((state) => state.isOpen);
  const devToolsHiddenComponents = useDevToolsStore((state) => state.hiddenComponents);
  const langToolsSelector = useLanguageWithForcedNodeSelector();
  const currentLanguage = useCurrentLanguage();
  const authContext = useMemo(() => buildAuthContext(process?.currentTask), [process?.currentTask]);
  const isHiddenSelector = Hidden.useIsHiddenSelector();
  const nodeFormDataSelector = useNodeFormDataSelector();
  const nodeDataSelector = NodesInternal.useNodeDataSelector();
  const nodeTraversal = useNodeTraversalSelectorLax();
  const transposeSelector = useDataModelBindingTranspose();

  const externalApiIds = useApplicationMetadata().externalApiIds ?? [];
  const externalApis = useExternalApis(externalApiIds);

  return useMemo(
    () => ({
      formDataSelector,
      formDataRowsSelector,
      attachmentsSelector,
      layoutSettings,
      process,
      optionsSelector,
      applicationSettings,
      instanceDataSources,
      authContext,
      devToolsIsOpen,
      devToolsHiddenComponents,
      langToolsSelector,
      currentLanguage,
      isHiddenSelector,
      nodeFormDataSelector,
      nodeDataSelector,
      nodeTraversal,
      transposeSelector,
      externalApis,
    }),
    [
      formDataSelector,
      formDataRowsSelector,
      attachmentsSelector,
      layoutSettings,
      process,
      optionsSelector,
      applicationSettings,
      instanceDataSources,
      authContext,
      devToolsIsOpen,
      devToolsHiddenComponents,
      langToolsSelector,
      currentLanguage,
      isHiddenSelector,
      nodeFormDataSelector,
      nodeDataSelector,
      nodeTraversal,
      transposeSelector,
      externalApis,
    ],
  );
}

import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioPageError, StudioPageSpinner } from '@studio/components';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider, useBpmnContext } from './contexts/BpmnContext';
import { ConfigPanel } from './components/ConfigPanel';
import { ConfigViewerPanel } from './components/ConfigViewerPanel';

import classes from './ProcessEditor.module.css';
import type { BpmnApiContextProps } from './contexts/BpmnApiContext';
import { BpmnApiContextProvider } from './contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from './contexts/BpmnConfigPanelContext';
import type { MetadataForm } from 'app-shared/types/BpmnMetadataForm';

export type ProcessEditorProps = {
  appLibVersion: string;
  bpmnXml: string | undefined | null;
  availableDataTypeIds: BpmnApiContextProps['availableDataTypeIds'];
  availableDataModelIds: BpmnApiContextProps['availableDataModelIds'];
  allDataModelIds: BpmnApiContextProps['allDataModelIds'];
  layoutSets: BpmnApiContextProps['layoutSets'];
  pendingApiOperations: boolean;
  existingCustomReceiptLayoutSetId: BpmnApiContextProps['existingCustomReceiptLayoutSetId'];
  addLayoutSet: BpmnApiContextProps['addLayoutSet'];
  deleteLayoutSet: BpmnApiContextProps['deleteLayoutSet'];
  mutateLayoutSetId: BpmnApiContextProps['mutateLayoutSetId'];
  mutateDataTypes: BpmnApiContextProps['mutateDataTypes'];
  saveBpmn: (bpmnXml: string, metadata?: MetadataForm) => void;
  openPolicyEditor: BpmnApiContextProps['openPolicyEditor'];
  onProcessTaskAdd: BpmnApiContextProps['onProcessTaskAdd'];
  onProcessTaskRemove: BpmnApiContextProps['onProcessTaskRemove'];
};

export const ProcessEditor = ({
  appLibVersion,
  bpmnXml,
  availableDataTypeIds,
  availableDataModelIds,
  allDataModelIds,
  layoutSets,
  pendingApiOperations,
  existingCustomReceiptLayoutSetId,
  addLayoutSet,
  deleteLayoutSet,
  mutateLayoutSetId,
  mutateDataTypes,
  saveBpmn,
  openPolicyEditor,
  onProcessTaskAdd,
  onProcessTaskRemove,
}: ProcessEditorProps): JSX.Element => {
  const { t } = useTranslation();

  if (bpmnXml === undefined) {
    return <StudioPageSpinner spinnerTitle={t('process_editor.loading')} showSpinnerTitle />;
  }

  if (bpmnXml === null) {
    return <NoBpmnFoundAlert />;
  }

  return (
    <BpmnContextProvider bpmnXml={bpmnXml} appLibVersion={appLibVersion}>
      <BpmnApiContextProvider
        availableDataTypeIds={availableDataTypeIds}
        availableDataModelIds={availableDataModelIds}
        allDataModelIds={allDataModelIds}
        layoutSets={layoutSets}
        pendingApiOperations={pendingApiOperations}
        existingCustomReceiptLayoutSetId={existingCustomReceiptLayoutSetId}
        addLayoutSet={addLayoutSet}
        deleteLayoutSet={deleteLayoutSet}
        mutateLayoutSetId={mutateLayoutSetId}
        mutateDataTypes={mutateDataTypes}
        saveBpmn={saveBpmn}
        openPolicyEditor={openPolicyEditor}
        onProcessTaskAdd={onProcessTaskAdd}
        onProcessTaskRemove={onProcessTaskRemove}
      >
        <BpmnConfigPanelFormContextProvider>
          <BpmnCanvas />
        </BpmnConfigPanelFormContextProvider>
      </BpmnApiContextProvider>
    </BpmnContextProvider>
  );
};

const BpmnCanvas = (): React.ReactElement | null => {
  const { isEditAllowed } = useBpmnContext();

  return (
    <div className={classes.container}>
      <Canvas />
      <div className={classes.container}>
        {isEditAllowed ? <ConfigPanel /> : <ConfigViewerPanel />}
      </div>
    </div>
  );
};

const NoBpmnFoundAlert = (): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <StudioPageError
      title={t('process_editor.fetch_bpmn_error_title')}
      message={t('process_editor.fetch_bpmn_error_message')}
    />
  );
};

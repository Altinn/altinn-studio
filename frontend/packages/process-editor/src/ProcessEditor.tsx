import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { StudioPageSpinner } from '@studio/components';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider, useBpmnContext } from './contexts/BpmnContext';
import { ConfigPanel } from './components/ConfigPanel';
import { ConfigViewerPanel } from './components/ConfigViewerPanel';

import classes from './ProcessEditor.module.css';
import type { BpmnApiContextProps } from './contexts/BpmnApiContext';
import { BpmnApiContextProvider } from './contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from './contexts/BpmnConfigPanelContext';
import type { MetaDataForm } from 'app-shared/types/BpmnMetaDataForm';

export type ProcessEditorProps = {
  appLibVersion: string;
  bpmnXml: string | undefined | null;
  currentPolicy: BpmnApiContextProps['currentPolicy'];
  availableDataModelIds: BpmnApiContextProps['availableDataModelIds'];
  layoutSets: BpmnApiContextProps['layoutSets'];
  pendingApiOperations: boolean;
  existingCustomReceiptLayoutSetId: BpmnApiContextProps['existingCustomReceiptLayoutSetId'];
  addLayoutSet: BpmnApiContextProps['addLayoutSet'];
  deleteLayoutSet: BpmnApiContextProps['deleteLayoutSet'];
  mutateApplicationPolicy: BpmnApiContextProps['mutateApplicationPolicy'];
  mutateLayoutSetId: BpmnApiContextProps['mutateLayoutSetId'];
  mutateDataType: BpmnApiContextProps['mutateDataType'];
  addDataTypeToAppMetadata: BpmnApiContextProps['addDataTypeToAppMetadata'];
  deleteDataTypeFromAppMetadata: BpmnApiContextProps['deleteDataTypeFromAppMetadata'];
  saveBpmn: (bpmnXml: string, metaData?: MetaDataForm) => void;
  openPolicyEditor: BpmnApiContextProps['openPolicyEditor'];
};

export const ProcessEditor = ({
  appLibVersion,
  bpmnXml,
  currentPolicy,
  availableDataModelIds,
  layoutSets,
  pendingApiOperations,
  existingCustomReceiptLayoutSetId,
  addLayoutSet,
  deleteLayoutSet,
  mutateApplicationPolicy,
  mutateLayoutSetId,
  mutateDataType,
  addDataTypeToAppMetadata,
  deleteDataTypeFromAppMetadata,
  saveBpmn,
  openPolicyEditor,
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
        availableDataModelIds={availableDataModelIds}
        currentPolicy={currentPolicy}
        layoutSets={layoutSets}
        pendingApiOperations={pendingApiOperations}
        existingCustomReceiptLayoutSetId={existingCustomReceiptLayoutSetId}
        addLayoutSet={addLayoutSet}
        deleteLayoutSet={deleteLayoutSet}
        mutateApplicationPolicy={mutateApplicationPolicy}
        mutateLayoutSetId={mutateLayoutSetId}
        mutateDataType={mutateDataType}
        addDataTypeToAppMetadata={addDataTypeToAppMetadata}
        deleteDataTypeFromAppMetadata={deleteDataTypeFromAppMetadata}
        saveBpmn={saveBpmn}
        openPolicyEditor={openPolicyEditor}
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
    <Alert severity='danger' style={{ height: 'min-content' }}>
      <Heading size='medium' level={2}>
        {t('process_editor.fetch_bpmn_error_title')}
      </Heading>
      <Paragraph>{t('process_editor.fetch_bpmn_error_message')}</Paragraph>
    </Alert>
  );
};

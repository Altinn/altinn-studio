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
  availableDataModelIds: BpmnApiContextProps['availableDataModelIds'];
  layoutSets: BpmnApiContextProps['layoutSets'];
  pendingApiOperations: boolean;
  existingCustomReceiptLayoutSetName: BpmnApiContextProps['existingCustomReceiptLayoutSetName'];
  addLayoutSet: BpmnApiContextProps['addLayoutSet'];
  deleteLayoutSet: BpmnApiContextProps['deleteLayoutSet'];
  mutateLayoutSet: BpmnApiContextProps['mutateLayoutSet'];
  mutateDataType: BpmnApiContextProps['mutateDataType'];
  addDataTypeToAppMetadata: BpmnApiContextProps['addDataTypeToAppMetadata'];
  deleteDataTypeFromAppMetadata: BpmnApiContextProps['deleteDataTypeFromAppMetadata'];
  saveBpmn: (bpmnXml: string, metaData?: MetaDataForm) => void;
};

export const ProcessEditor = ({
  appLibVersion,
  bpmnXml,
  availableDataModelIds,
  layoutSets,
  pendingApiOperations,
  existingCustomReceiptLayoutSetName,
  addLayoutSet,
  deleteLayoutSet,
  mutateLayoutSet,
  mutateDataType,
  addDataTypeToAppMetadata,
  deleteDataTypeFromAppMetadata,
  saveBpmn,
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
        layoutSets={layoutSets}
        pendingApiOperations={pendingApiOperations}
        existingCustomReceiptLayoutSetName={existingCustomReceiptLayoutSetName}
        addLayoutSet={addLayoutSet}
        deleteLayoutSet={deleteLayoutSet}
        mutateLayoutSet={mutateLayoutSet}
        mutateDataType={mutateDataType}
        addDataTypeToAppMetadata={addDataTypeToAppMetadata}
        deleteDataTypeFromAppMetadata={deleteDataTypeFromAppMetadata}
        saveBpmn={saveBpmn}
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

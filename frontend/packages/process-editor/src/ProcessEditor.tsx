import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { PageLoading } from './components/PageLoading';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider, useBpmnContext } from './contexts/BpmnContext';
import {
  BpmnConfigPanelFormContextProvider,
  type MetaDataForm,
  useBpmnConfigPanelFormContext,
} from './contexts/BpmnConfigPanelContext';
import { ConfigPanel } from './components/ConfigPanel';
import { ConfigViewerPanel } from './components/ConfigViewerPanel';

import classes from './ProcessEditor.module.css';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

export type ProcessEditorProps = {
  bpmnXml: string | undefined | null;
  existingCustomReceipt: string | undefined;
  onSave: (bpmnXml: string, metaData?: MetaDataForm) => void;
  onUpdateLayoutSet: (layoutSetIdToUpdate: string, layoutSetConfig: LayoutSetConfig) => void;
  appLibVersion: string;
};

export const ProcessEditor = ({
  bpmnXml,
  existingCustomReceipt,
  onSave,
  onUpdateLayoutSet,
  appLibVersion,
}: ProcessEditorProps): React.ReactElement => {
  const { t } = useTranslation();

  if (bpmnXml === undefined) {
    return <PageLoading title={t('process_editor.loading')} />;
  }

  if (bpmnXml === null) {
    return <NoBpmnFoundAlert />;
  }

  return (
    <BpmnContextProvider bpmnXml={bpmnXml} appLibVersion={appLibVersion}>
      <BpmnConfigPanelFormContextProvider>
        <BPMNCanvas
          onSave={onSave}
          existingCustomReceipt={existingCustomReceipt}
          onUpdateLayoutSet={onUpdateLayoutSet}
        />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContextProvider>
  );
};

type BPMNCanvasProps = Pick<
  ProcessEditorProps,
  'onSave' | 'existingCustomReceipt' | 'onUpdateLayoutSet'
>;
const BPMNCanvas = ({
  onSave,
  existingCustomReceipt,
  onUpdateLayoutSet,
}: BPMNCanvasProps): React.ReactElement | null => {
  const { isEditAllowed } = useBpmnContext();
  const { metaDataForm, resetForm } = useBpmnConfigPanelFormContext();

  const handleSave = (bpmnXml: string): void => {
    onSave(bpmnXml, metaDataForm || null);
    resetForm();
  };

  return (
    <div className={classes.container}>
      <Canvas onSave={handleSave} />
      {isEditAllowed ? (
        <ConfigPanel
          existingCustomReceiptName={existingCustomReceipt}
          onUpdateLayoutSet={onUpdateLayoutSet}
        />
      ) : (
        <ConfigViewerPanel />
      )}
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

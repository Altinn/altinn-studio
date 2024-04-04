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
import type { BpmnApiContextProps } from './contexts/BpmnApiContext';
import { BpmnApiContextProvider } from './contexts/BpmnApiContext';

export type ProcessEditorProps = {
  appLibVersion: string;
  bpmnXml: string | undefined | null;
  onSave: (bpmnXml: string, metaData?: MetaDataForm) => void;
  layoutSets: BpmnApiContextProps['layoutSets'];
  existingCustomReceiptLayoutSetName: BpmnApiContextProps['existingCustomReceiptLayoutSetName'];
  addLayoutSet: BpmnApiContextProps['addLayoutSet'];
  mutateLayoutSet: BpmnApiContextProps['mutateLayoutSet'];
};

export const ProcessEditor = ({
  appLibVersion,
  bpmnXml,
  onSave,
  layoutSets,
  existingCustomReceiptLayoutSetName,
  addLayoutSet,
  mutateLayoutSet,
}: ProcessEditorProps): JSX.Element => {
  const { t } = useTranslation();

  if (bpmnXml === undefined) {
    return <PageLoading title={t('process_editor.loading')} />;
  }

  if (bpmnXml === null) {
    return <NoBpmnFoundAlert />;
  }

  return (
    <BpmnContextProvider bpmnXml={bpmnXml} appLibVersion={appLibVersion}>
      <BpmnApiContextProvider
        layoutSets={layoutSets}
        existingCustomReceiptLayoutSetName={existingCustomReceiptLayoutSetName}
        addLayoutSet={addLayoutSet}
        mutateLayoutSet={mutateLayoutSet}
      >
        <BpmnConfigPanelFormContextProvider>
          <BpmnCanvas onSave={onSave} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnApiContextProvider>
    </BpmnContextProvider>
  );
};

type BpmnCanvasProps = Pick<ProcessEditorProps, 'onSave'>;
const BpmnCanvas = ({ onSave }: BpmnCanvasProps): React.ReactElement | null => {
  const { isEditAllowed } = useBpmnContext();
  const { metaDataForm, resetForm } = useBpmnConfigPanelFormContext();

  const handleSave = (bpmnXml: string): void => {
    onSave(bpmnXml, metaDataForm || null);
    resetForm();
  };

  return (
    <div className={classes.container}>
      <Canvas onSave={handleSave} />
      {isEditAllowed ? <ConfigPanel /> : <ConfigViewerPanel />}
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

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { PageLoading } from './components/PageLoading';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider, useBpmnContext } from './contexts/BpmnContext';
import { ConfigPanel } from './components/ConfigPanel';
import { ConfigViewerPanel } from './components/ConfigViewerPanel';

import classes from './ProcessEditor.module.css';

export type ProcessEditorProps = {
  bpmnXml: string | undefined | null;
  onSave: (bpmnXml: string) => void;
  appLibVersion: string;
};

export const ProcessEditor = ({
  bpmnXml,
  onSave,
  appLibVersion,
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
      <BPMNCanvas onSave={onSave} />
    </BpmnContextProvider>
  );
};

type BPMNCanvasProps = Pick<ProcessEditorProps, 'onSave'>;
const BPMNCanvas = ({ onSave }: BPMNCanvasProps): React.ReactElement | null => {
  const { isEditAllowed } = useBpmnContext();
  return (
    <div className={classes.container}>
      <Canvas onSave={onSave} />
      {!isEditAllowed ? <ConfigPanel /> : <ConfigViewerPanel />}
    </div>
  );
};

const NoBpmnFoundAlert = (): JSX.Element => {
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

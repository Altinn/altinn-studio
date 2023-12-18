import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { PageLoading } from './components/PageLoading';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider } from './contexts/BpmnContext';
import { ConfigPanel } from './components/ConfigPanel';
import { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import classes from './ProcessEditor.module.css';

export type ProcessEditorProps = {
  bpmnXml: string | undefined | null;
  onSave: (bpmnXml: string) => void;
  appLibVersion: string;
  applicationMetadata: ApplicationMetadata;
  updateApplicationMetadata: (applicationMetadata: ApplicationMetadata) => void;
};

export const ProcessEditor = ({
  bpmnXml,
  onSave,
  appLibVersion,
  applicationMetadata,
  updateApplicationMetadata,
}: ProcessEditorProps): JSX.Element => {
  const { t } = useTranslation();

  if (bpmnXml === undefined) {
    return <PageLoading title={t('process_editor.loading')} />;
  }

  if (bpmnXml === null) {
    return <NoBpmnFoundAlert />;
  }

  return (
    <BpmnContextProvider
      bpmnXml={bpmnXml}
      appLibVersion={appLibVersion}
      applicationMetadata={applicationMetadata}
      updateApplicationMetadata={updateApplicationMetadata}
    >
      <div className={classes.container}>
        <Canvas onSave={onSave} />
        <ConfigPanel />
      </div>
    </BpmnContextProvider>
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

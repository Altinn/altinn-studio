import React from 'react';
import classes from './ProcessEditor.module.css';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { PageLoading } from './components/PageLoading';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider } from './contexts/BpmnContext';

type ProcessEditorProps = {
  bpmnXml: string | undefined | null;
  onSave: (bpmnXml: string) => void;
  appLibVersion: any;
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
    <BpmnContextProvider bpmnXml={bpmnXml}>
      <div className={classes.alertWrapper}>
        {/* TODO - Add logic check for edit button*/}
        <Alert>{appLibVersion}</Alert>
      </div>
      <Canvas onSave={onSave} />
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

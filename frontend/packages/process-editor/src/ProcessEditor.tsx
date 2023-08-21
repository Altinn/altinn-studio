import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { PageLoading } from './components/PageLoading';
import { Canvas } from './components/Canvas';

type ProcessEditorProps = {
  bpmnXml: string | undefined | null;
  onSave: (bpmnXml: string) => void;
};
export const ProcessEditor = ({ bpmnXml, onSave }: ProcessEditorProps): JSX.Element => {
  const { t } = useTranslation();
  if (bpmnXml === undefined) {
    return <PageLoading title={t('process_editor_loading')} />;
  }

  if (bpmnXml === null) {
    return (
      <Alert severity='danger' style={{ height: 'min-content' }}>
        <Heading size='medium' level={2}>
          {t('process_editor.fetch_bpmn_error_title')}
        </Heading>
        <Paragraph>{t('process_editor.fetch_bpmn_error_message')}</Paragraph>
      </Alert>
    );
  }

  return <Canvas bpmnXml={bpmnXml} onSave={onSave}/>;
};

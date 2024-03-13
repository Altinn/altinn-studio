import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { PageLoading } from './components/PageLoading';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider } from './contexts/BpmnContext';
import { ConfigPanel } from './components/ConfigPanel';

import classes from './ProcessEditor.module.css';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

export type ProcessEditorProps = {
  bpmnXml: string | undefined | null;
  existingCustomReceipt: string | undefined;
  onSave: (bpmnXml: string) => void;
  onUpdateLayoutSet: (layoutSetIdToUpdate: string, layoutSetConfig: LayoutSetConfig) => void;
  appLibVersion: string;
};

export const ProcessEditor = ({
  bpmnXml,
  existingCustomReceipt,
  onSave,
  onUpdateLayoutSet,
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
      <div className={classes.container}>
        <Canvas onSave={onSave} />
        <ConfigPanel
          existingCustomReceiptName={existingCustomReceipt}
          onUpdateLayoutSet={onUpdateLayoutSet}
        />
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

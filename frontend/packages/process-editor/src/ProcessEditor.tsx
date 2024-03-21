import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { PageLoading } from './components/PageLoading';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider } from './contexts/BpmnContext';
import { ConfigPanel } from './components/ConfigPanel';

import classes from './ProcessEditor.module.css';
import type { BpmnApiContextProps } from './contexts/BpmnApiContext';
import { BpmnApiContextProvider } from './contexts/BpmnApiContext';

export type ProcessEditorProps = {
  appLibVersion: string;
  bpmnXml: string | undefined | null;
  onSave: (bpmnXml: string) => void;
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
        <div className={classes.container}>
          <Canvas onSave={onSave} />
          <ConfigPanel />
        </div>
      </BpmnApiContextProvider>
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

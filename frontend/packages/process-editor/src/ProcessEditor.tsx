import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { StudioPageSpinner } from '@studio/components';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider, useBpmnContext } from './contexts/BpmnContext';
import {
  BpmnConfigPanelFormContextProvider,
  type MetaDataForm,
} from './contexts/BpmnConfigPanelContext';
import { ConfigPanel } from './components/ConfigPanel';
import { ConfigViewerPanel } from './components/ConfigViewerPanel';

import classes from './ProcessEditor.module.css';
import type { BpmnApiContextProps } from './contexts/BpmnApiContext';
import { BpmnApiContextProvider } from './contexts/BpmnApiContext';

export type ProcessEditorProps = {
  appLibVersion: string;
  bpmnXml: string | undefined | null;
  layoutSets: BpmnApiContextProps['layoutSets'];
  existingCustomReceiptLayoutSetName: BpmnApiContextProps['existingCustomReceiptLayoutSetName'];
  addLayoutSet: BpmnApiContextProps['addLayoutSet'];
  deleteLayoutSet: BpmnApiContextProps['deleteLayoutSet'];
  mutateLayoutSet: BpmnApiContextProps['mutateLayoutSet'];
  saveBpmn: (bpmnXml: string, metaData?: MetaDataForm) => void;
};

export const ProcessEditor = ({
  appLibVersion,
  bpmnXml,
  layoutSets,
  existingCustomReceiptLayoutSetName,
  addLayoutSet,
  deleteLayoutSet,
  mutateLayoutSet,
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
        layoutSets={layoutSets}
        existingCustomReceiptLayoutSetName={existingCustomReceiptLayoutSetName}
        addLayoutSet={addLayoutSet}
        deleteLayoutSet={deleteLayoutSet}
        mutateLayoutSet={mutateLayoutSet}
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

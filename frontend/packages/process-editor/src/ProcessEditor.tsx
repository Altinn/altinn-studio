import React from 'react';
import classes from './ProcessEditor.module.css';
import { Trans, useTranslation } from 'react-i18next';
import { Alert, Heading, Link, Paragraph } from '@digdir/design-system-react';
import { PageLoading } from './components/PageLoading';
import { Canvas } from './components/Canvas';
import { BpmnContextProvider } from './contexts/BpmnContext';
import { getIfVersionIs8OrNewer } from './utils/processEditorUtils';

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

  const isEditAllowed: boolean = getIfVersionIs8OrNewer(appLibVersion);

  return (
    <BpmnContextProvider bpmnXml={bpmnXml}>
      {!isEditAllowed && (
        <div className={classes.alertWrapper}>
          {/* TODO - Add logic check for edit button*/}
          <Alert severity='warning' className={classes.alert}>
            <Heading level={1} size='xsmall' spacing>
              {t('process_editor.too_old_version_title')}
            </Heading>
            <Paragraph className={classes.alertText} size='small'>
              <Trans i18nKey={t('process_editor.too_old_version_text')}>
                Applikasjonen din har versjon <strong>{appLibVersion}</strong> av app-lib-pakken.
                <br />
                Versjonen er for gammel for å kunne redigere denne modellen. <br />
                <br />
                Du kan se på prosessen, men vi anbefaler at du oppgraderer til versjon 8 eller
                nyere.
                <br />
                <br />
                Trenger du hjelp til å oppgradere, kan du kontakte{' '}
                <Link href='servicedesk@altinn.no' target='_new' rel='noopener noreferrer'>
                  servicedesken
                </Link>{' '}
                vår.
              </Trans>
            </Paragraph>
          </Alert>
        </div>
      )}
      <Canvas onSave={onSave} isEditAllowed={isEditAllowed} />
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

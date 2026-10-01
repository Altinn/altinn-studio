import { useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioButton, StudioParagraph } from '@studio/components';
import type { AxiosError } from 'axios';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { HttpResponseUtils } from 'app-shared/utils/httpResponseUtils';
import { useAppMetadataMutation } from 'app-development/hooks/mutations/useAppMetadataMutation';
import { AppConfigForm } from './AppConfigForm';
import classes from './VersionedAppConfigForm.module.css';

type VersionedAppConfigFormProps = {
  initialMetadata: ApplicationMetadata;
  reload: () => Promise<ApplicationMetadata>;
};

type SaveFailure = 'conflict' | 'error';

const failureMessageKeys: Record<SaveFailure, string> = {
  conflict: 'app_settings.metadata_save_conflict',
  error: 'app_settings.metadata_save_failed',
};

export function VersionedAppConfigForm({
  initialMetadata,
  reload,
}: VersionedAppConfigFormProps): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutateAsync: save } = useAppMetadataMutation(org, app, {
    hideDefaultError: HttpResponseUtils.isPreconditionFailed,
  });
  // A background refetch must not attach a new revision to the form's existing draft.
  const [snapshot, setSnapshot] = useState(initialMetadata);
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const busyRef = useRef(false);

  const saveChanges = async (metadata: ApplicationMetadata): Promise<void> => {
    if (busyRef.current || failure) return;
    busyRef.current = true;
    setBusy(true);
    try {
      setSnapshot(await save({ ...metadata, revision: snapshot.revision }));
      setFormKey((key) => key + 1);
    } catch (error) {
      setFailure(
        HttpResponseUtils.isPreconditionFailed(error as AxiosError) ? 'conflict' : 'error',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const discardChanges = async (): Promise<void> => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      setSnapshot(await reload());
      setFormKey((key) => key + 1);
      setFailure(null);
    } catch {
      // The alert stays, so the user can try again.
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div>
      {failure && (
        <StudioAlert data-color='danger' role='alert' className={classes.alert}>
          <StudioParagraph>{t(failureMessageKeys[failure])}</StudioParagraph>
          <StudioButton onClick={() => void discardChanges()} disabled={busy} variant='secondary'>
            {t('app_settings.metadata_reload')}
          </StudioButton>
        </StudioAlert>
      )}
      <fieldset className={classes.form} disabled={busy || failure !== null} aria-busy={busy}>
        <AppConfigForm
          key={formKey}
          appConfig={snapshot}
          saveAppConfig={(metadata) => void saveChanges(metadata)}
        />
      </fieldset>
    </div>
  );
}

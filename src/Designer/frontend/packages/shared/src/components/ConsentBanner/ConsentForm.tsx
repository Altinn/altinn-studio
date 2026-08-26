import type { FormEvent, ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioCheckbox, StudioFieldset, StudioHeading } from '@studio/components';
import { useConsent, useConsentMutation } from '../../utils/consent';
import classes from './ConsentForm.module.css';

type ConsentFormProps = {
  headingId?: string;
  onSave?: () => void;
  onDeclineAll?: () => void;
};

export const ConsentForm = ({
  headingId,
  onSave,
  onDeclineAll,
}: ConsentFormProps): ReactElement => {
  const { t } = useTranslation();
  const { setConsentPreferences, denyAllConsent } = useConsentMutation();
  const { hasAnalyticsConsent, hasSessionRecordingConsent } = useConsent();
  const [analytics, setAnalytics] = useState(hasAnalyticsConsent);
  const [sessionRecording, setSessionRecording] = useState(
    hasAnalyticsConsent && hasSessionRecordingConsent,
  );

  const handleAnalyticsChange = (checked: boolean): void => {
    setAnalytics(checked);
    if (!checked) {
      setSessionRecording(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setConsentPreferences({ analytics, sessionRecording });
    onSave?.();
  };

  const handleDeclineAll = (): void => {
    setAnalytics(false);
    setSessionRecording(false);
    denyAllConsent();
    onDeclineAll?.();
  };

  return (
    <form className={classes.form} onSubmit={handleSubmit}>
      <StudioFieldset
        legend={
          <StudioHeading id={headingId} level={2}>
            {t('consent.banner.title')}
          </StudioHeading>
        }
        description={t('consent.banner.description')}
      >
        <StudioCheckbox
          checked={analytics}
          label={t('consent.banner.analytics.label')}
          onChange={(event) => handleAnalyticsChange(event.target.checked)}
          value='analytics'
        />
        <StudioCheckbox
          checked={sessionRecording}
          disabled={!analytics}
          label={t('consent.banner.sessionRecording.label')}
          onChange={(event) => setSessionRecording(event.target.checked)}
          value='sessionRecording'
        />
      </StudioFieldset>
      <div className={classes.actions}>
        <StudioButton type='submit'>{t('consent.banner.save')}</StudioButton>
        {onDeclineAll && (
          <StudioButton type='button' onClick={handleDeclineAll}>
            {t('consent.banner.declineAll')}
          </StudioButton>
        )}
      </div>
    </form>
  );
};

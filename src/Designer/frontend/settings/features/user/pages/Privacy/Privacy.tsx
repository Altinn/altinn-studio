import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioHeading, StudioParagraph, StudioSwitch } from '@studio/components';
import { useConsent, useConsentMutation } from 'app-shared/utils/consent';
import { toast } from 'react-toastify';
import classes from './Privacy.module.css';

export const Privacy = (): ReactElement => {
  const { t } = useTranslation();
  const { hasAnalyticsConsent, hasSessionRecordingConsent } = useConsent();
  const { setConsentPreferences, denyAllConsent } = useConsentMutation();

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

  const handleSave = (): void => {
    setConsentPreferences({ analytics, sessionRecording: analytics && sessionRecording });
    toast.success(t('settings.user.privacy.saved'), { toastId: 'privacy-saved' });
  };

  const handleDeclineAll = (): void => {
    setAnalytics(false);
    setSessionRecording(false);
    denyAllConsent();
    toast.success(t('settings.user.privacy.revoked'), { toastId: 'privacy-revoked' });
  };

  return (
    <div className={classes.container}>
      <div className={classes.heading}>
        <StudioHeading level={2} data-size='md'>
          {t('settings.user.privacy.heading')}
        </StudioHeading>
        <StudioParagraph data-size='md'>{t('consent.banner.description')}</StudioParagraph>
      </div>
      <div className={classes.content}>
        <StudioSwitch
          checked={analytics}
          onChange={(e) => handleAnalyticsChange(e.target.checked)}
          label={t('consent.banner.analytics.label')}
        />
        <StudioSwitch
          checked={sessionRecording}
          onChange={(e) => setSessionRecording(e.target.checked)}
          disabled={!analytics}
          label={t('consent.banner.sessionRecording.label')}
        />
        <div className={classes.actions}>
          <StudioButton variant='primary' onClick={handleSave}>
            {t('consent.banner.save')}
          </StudioButton>
          <StudioButton variant='secondary' onClick={handleDeclineAll}>
            {t('consent.banner.declineAll')}
          </StudioButton>
        </div>
      </div>
    </div>
  );
};

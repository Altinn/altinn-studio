import type { ReactElement } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioHeading, StudioParagraph, StudioSwitch } from '@studio/components';
import { useConsent, useConsentMutation } from '../../utils/consent';
import classNames from 'classnames';
import classes from './ConsentForm.module.css';

type ConsentFormProps = {
  variant?: 'banner' | 'default';
  onSave?: () => void;
  onDeclineAll?: () => void;
};

export const ConsentForm = ({
  variant = 'default',
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

  const isBanner = variant === 'banner';

  const handleAnalyticsChange = (checked: boolean): void => {
    setAnalytics(checked);
    if (!checked) {
      setSessionRecording(false);
    }
  };

  const handleSave = (): void => {
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
    <div className={classes.form}>
      <StudioHeading level={2}>{t('consent.banner.title')}</StudioHeading>
      <StudioParagraph>{t('consent.banner.description')}</StudioParagraph>
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
      <div className={classNames(classes.actions, isBanner && classes.bannerActions)}>
        <StudioButton variant='primary' onClick={handleSave} disabled={isBanner && !analytics}>
          {t('consent.banner.save')}
        </StudioButton>
        {onDeclineAll && (
          <StudioButton variant='secondary' onClick={handleDeclineAll}>
            {t('consent.banner.declineAll')}
          </StudioButton>
        )}
      </div>
    </div>
  );
};

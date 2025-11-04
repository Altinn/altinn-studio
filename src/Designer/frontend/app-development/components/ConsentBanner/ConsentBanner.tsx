import React, { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSwitch, StudioBanner, StudioButton } from '@studio/components';
import { useConsent, useConsentMutation } from '../../utils/consent';

export const ConsentBanner = (): ReactElement | null => {
  const { t } = useTranslation();
  const { hasDecision } = useConsent();
  const { setConsentPreferences, denyAllConsent } = useConsentMutation();
  const [isVisible, setIsVisible] = useState(!hasDecision);
  const [analytics, setAnalytics] = useState(true);
  const [sessionRecording, setSessionRecording] = useState(true);

  const handleSave = (): void => {
    setConsentPreferences({ analytics, sessionRecording });
    setIsVisible(false);
  };

  const handleDeclineAll = (): void => {
    denyAllConsent();
    setIsVisible(false);
  };

  return (
    <StudioBanner
      isVisible={isVisible}
      title={t('consent.banner.title')}
      description={t('consent.banner.description')}
      actions={
        <>
          <StudioButton variant='secondary' onClick={handleDeclineAll}>
            {t('consent.banner.declineAll')}
          </StudioButton>
          <StudioButton
            variant='primary'
            onClick={handleSave}
            disabled={!analytics && !sessionRecording}
          >
            {t('consent.banner.save')}
          </StudioButton>
        </>
      }
    >
      <StudioSwitch
        checked={analytics}
        onChange={(e) => setAnalytics(e.target.checked)}
        label={t('consent.banner.analytics.label')}
      />

      <StudioSwitch
        checked={sessionRecording}
        onChange={(e) => setSessionRecording(e.target.checked)}
        disabled={!analytics}
        label={t('consent.banner.sessionRecording.label')}
      />
    </StudioBanner>
  );
};

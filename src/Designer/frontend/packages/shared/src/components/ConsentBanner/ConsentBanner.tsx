import type { ReactElement } from 'react';
import { useState } from 'react';
import { StudioBanner } from '@studio/components';
import { useConsent } from '../../utils/consent';
import { ConsentForm } from './ConsentForm';

export const ConsentBanner = (): ReactElement | null => {
  const { hasDecision } = useConsent();
  const [isVisible, setIsVisible] = useState(!hasDecision);

  const handleClose = (): void => setIsVisible(false);

  return (
    <StudioBanner isVisible={isVisible}>
      <ConsentForm variant='banner' onSave={handleClose} onDeclineAll={handleClose} />
    </StudioBanner>
  );
};

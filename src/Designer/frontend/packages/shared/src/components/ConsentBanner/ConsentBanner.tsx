import type { ReactElement } from 'react';
import { useId, useState } from 'react';
import { useConsent } from '../../utils/consent';
import { ConsentForm } from './ConsentForm';
import classes from './ConsentBanner.module.css';

export const ConsentBanner = (): ReactElement | null => {
  const { hasDecision } = useConsent();
  const [isVisible, setIsVisible] = useState(!hasDecision);
  const headingId = useId();

  const handleClose = (): void => setIsVisible(false);

  if (!isVisible) {
    return null;
  }

  return (
    <section className={classes.banner} aria-labelledby={headingId}>
      <div className={classes.content}>
        <ConsentForm headingId={headingId} onSave={handleClose} onDeclineAll={handleClose} />
      </div>
    </section>
  );
};

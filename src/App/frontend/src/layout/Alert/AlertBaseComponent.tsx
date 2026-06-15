import React from 'react';

import { Alert as AlertDesignSystem } from '@digdir/designsystemet-react';

import styles from 'src/layout/Alert/Alert.module.css';
import type { AlertSeverity } from 'src/layout/Alert/config.generated';

// Critical severities use role="alert" (implicit assertive live region), others use the less
// intrusive role="status" (implicit polite live region). We deliberately do not also set aria-live:
// combining it with role="alert"/"status" causes double announcements in VoiceOver on iOS.
// See https://designsystemet.no/no/components/docs/alert/accessibility
function calculateRole(severity: AlertSeverity): 'alert' | 'status' {
  if (severity === 'warning' || severity === 'danger') {
    return 'alert';
  }
  return 'status';
}

export type AlertBaseComponentProps = {
  title?: string;
  children?: React.ReactNode;
  useAsAlert?: boolean;
  severity: AlertSeverity;
  ariaLabel?: string;
};

export const AlertBaseComponent = ({ title, children, useAsAlert, severity, ariaLabel }: AlertBaseComponentProps) => (
  <AlertDesignSystem
    className={styles.container}
    data-color={severity}
    role={useAsAlert ? calculateRole(severity) : undefined}
    aria-label={useAsAlert ? (ariaLabel ?? title) : undefined}
  >
    {title && <span className={styles.title}>{title}</span>}
    <div className={styles.body}>{children}</div>
  </AlertDesignSystem>
);

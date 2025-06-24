import React from 'react';

import { Alert as AlertDesignSystem } from '@digdir/designsystemet-react';

import styles from 'src/layout/Alert/Alert.module.css';
import type { AlertSeverity } from 'src/layout/Alert/config.generated';

function calculateAriaLive(severity: AlertSeverity): 'polite' | 'assertive' {
  if (severity === 'warning' || severity === 'danger') {
    return 'assertive';
  }
  return 'polite';
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
    role={useAsAlert ? 'alert' : undefined}
    aria-live={useAsAlert ? calculateAriaLive(severity) : undefined}
    aria-label={useAsAlert ? (ariaLabel ?? title) : undefined}
  >
    {title && <span className={styles.title}>{title}</span>}
    <div className={styles.body}>{children}</div>
  </AlertDesignSystem>
);

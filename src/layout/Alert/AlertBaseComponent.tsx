import React from 'react';

import { Alert as AlertDesignSystem } from '@digdir/design-system-react';

import styles from 'src/layout/Alert/Alert.module.css';
import type { AlertSeverity } from 'src/layout/Alert/types';

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
    severity={severity}
    role={useAsAlert ? 'alert' : undefined}
    aria-live={useAsAlert ? calculateAriaLive(severity) : undefined}
    aria-label={useAsAlert ? ariaLabel ?? title : undefined}
  >
    <span className={styles.title}>{title}</span>
    <div className={styles.body}>{children}</div>
  </AlertDesignSystem>
);

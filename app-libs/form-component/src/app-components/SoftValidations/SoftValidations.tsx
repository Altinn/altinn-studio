import type { ReactNode } from 'react';

import { Alert } from '@digdir/designsystemet-react';

import classes from './SoftValidations.module.css';

export type SoftValidationSeverity = 'warning' | 'info' | 'success';

export interface SoftValidationItem {
  /** Stable identifier for the message, unique within the list */
  id: string;
  /** Already translated/rendered message content */
  message: ReactNode;
}

export interface SoftValidationsProps {
  validations: SoftValidationItem[];
  severity: SoftValidationSeverity;
}

export function SoftValidations({ validations, severity }: SoftValidationsProps) {
  const alertRole = severity === 'info' || severity === 'success' ? 'status' : 'alert';

  return (
    <Alert className={classes.softValidation} data-color={severity} role={alertRole}>
      <ul className={classes.softValidationListItem}>
        {validations.map((validation) => (
          <li key={validation.id}>{validation.message}</li>
        ))}
      </ul>
    </Alert>
  );
}

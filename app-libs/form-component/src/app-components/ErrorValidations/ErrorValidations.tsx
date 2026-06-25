import type { ReactNode } from 'react';

import { ValidationMessage } from '@digdir/designsystemet-react';

import classes from './ErrorValidations.module.css';

export interface ErrorValidationItem {
  /** Stable identifier for the message, unique within the list */
  id: string;
  /** Already translated/rendered message content */
  message: ReactNode;
}

export interface ErrorValidationsProps {
  validations: ErrorValidationItem[];
}

export function ErrorValidations({ validations }: ErrorValidationsProps) {
  return (
    <ul className={classes.errorList}>
      {validations.map((validation) => (
        <li key={validation.id}>
          <ValidationMessage data-size='sm' asChild>
            <span>{validation.message}</span>
          </ValidationMessage>
        </li>
      ))}
    </ul>
  );
}

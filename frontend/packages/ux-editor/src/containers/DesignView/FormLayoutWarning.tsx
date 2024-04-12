import React from 'react';
import type { IInternalLayout } from '../../types/global';
import { getDuplicatedIds } from '../../utils/formLayoutUtils';
import { Paragraph } from '@digdir/design-system-react';
import classes from './FormLayoutWarning.module.css';
interface FormLayoutWarningProps {
  layout: IInternalLayout;
}

export const FormLayoutWarning = ({ layout }: FormLayoutWarningProps) => {
  const duplicatedIds = getDuplicatedIds(layout).join(', ');

  return (
    <div className={classes.warningWrapper}>
      <Paragraph size='small'>
        Du har brukt samme ID på flere komponenter:
        <span className={classes.duplicatedId}> {duplicatedIds}</span>
      </Paragraph>
      <Paragraph size='small'>
        Du kan ikke publisere appen eller konfigurere komponentene før du har rettet opp feilen.
      </Paragraph>
    </div>
  );
};

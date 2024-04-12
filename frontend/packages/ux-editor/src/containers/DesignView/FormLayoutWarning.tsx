import React from 'react';
import type { IInternalLayout } from '../../types/global';
import { getDuplicatedIds } from '../../utils/formLayoutUtils';
import { Paragraph } from '@digdir/design-system-react';
import classes from './FormLayoutWarning.module.css';
interface FormLayoutWarningProps {
  layout: IInternalLayout;
}

export const FormLayoutWarning = ({ layout }: FormLayoutWarningProps) => {
  const duplicatedIds = getDuplicatedIds(layout);
  const severalDuplicatedIds = duplicatedIds.length > 1;

  return (
    <div className={classes.warningWrapper}>
      <Paragraph>
        Denne IDen er brukt i flere komponenter:
        {duplicatedIds.map((id) => (
          <span key={id} className={classes.duplicatedId}>
            {` ${id}${severalDuplicatedIds && ', '}`}
          </span>
        ))}
      </Paragraph>
      <Paragraph>
        Du kan ikke publisere appen eller konfigurere komponentene før du har rettet opp feilen.
      </Paragraph>
    </div>
  );
};

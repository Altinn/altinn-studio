import React from 'react';
import classes from './ProcessReceiptView.module.css';
import { Heading, Link, Paragraph } from '@digdir/design-system-react';

export type ProcessReceiptViewProps = {};

export const ProcessReceiptView = ({}: ProcessReceiptViewProps): React.JSX.Element => {
  return (
    <div className={classes.wrapper}>
      <Heading level={2} size='xxsmall' spacing>
        Standardkvittering
      </Heading>
      <Paragraph spacing size='small'>
        Vi har satt opp en automatisk standardkvittering i appen.
      </Paragraph>
      <Link
        size='small'
        href='https://docs.altinn.studio/app/development/configuration/process/customize/#receipt'
      >
        Les mer om standardkvittering i dokumentasjonen
      </Link>
    </div>
  );
};

import React from 'react';
import type { JSX } from 'react';

import { Heading, Paragraph } from '@digdir/designsystemet-react';

import classes from 'src/components/organisms/AltinnReceipt.module.css';

export interface IReceiptComponentProps {
  body: string | JSX.Element | JSX.Element[] | null;
  title: string | JSX.Element | JSX.Element[] | null;
}

export function ReceiptComponentSimple({ title, body }: IReceiptComponentProps) {
  return (
    <div className={classes.wordBreak}>
      <Heading
        level={2}
        data-size='md'
      >
        {title}
      </Heading>
      <Paragraph className={classes.paddingTop24}>{body}</Paragraph>
    </div>
  );
}

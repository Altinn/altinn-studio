import React from 'react';
import classes from './ReceiptContent.module.css';
import type { FormLayoutPage } from '../../../types/FormLayoutPage';
import { PageAccordion } from '../PageAccordion';
import { Accordion } from '@digdir/design-system-react';
import { FormTree } from '../FormTree';

export type ReceiptContentProps = {
  receiptName: string;
  selectedAccordion: string;
  formLayoutData: FormLayoutPage[];
  onClickAccordion: () => void;
};

export const ReceiptContent = ({
  receiptName,
  selectedAccordion,
  formLayoutData,
  onClickAccordion,
}: ReceiptContentProps): React.ReactElement | null => {
  if (!receiptName) return null;

  const receiptData = formLayoutData.find((d) => d.page === receiptName);
  if (receiptData === undefined) return null;

  const layout = receiptData.data;

  return (
    <div className={classes.wrapper}>
      <div className={classes.accordionWrapper}>
        <Accordion color='neutral'>
          <PageAccordion
            pageName={receiptName}
            isOpen={receiptName === selectedAccordion}
            onClick={onClickAccordion}
            pageIsReceipt
          >
            <FormTree layout={layout} />
          </PageAccordion>
        </Accordion>
      </div>
    </div>
  );
};

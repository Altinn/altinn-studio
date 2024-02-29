import type { ReactNode } from 'react';
import React from 'react';
import classes from './ReceiptContent.module.css';
import type { FormLayoutPage } from '../../../types/FormLayoutPage';
import { PageAccordion } from '../PageAccordion';
import { Accordion } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
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
}: ReceiptContentProps): ReactNode => {
  const { t } = useTranslation();

  if (receiptName) {
    const receiptData = formLayoutData.find((d) => d.page === receiptName);
    if (receiptData === undefined) return null;

    const layout = receiptData.data;

    return (
      <div className={classes.wrapper}>
        <div className={classes.accordionWrapper}>
          <Accordion color='neutral' className={classes.accordion}>
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
  }
};

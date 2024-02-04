import type { ReactNode } from 'react';
import React from 'react';
import classes from './ReceiptContent.module.css';
import type { FormLayoutPage } from '../../../types/FormLayoutPage';
import { PageAccordion } from '../PageAccordion';
import { Accordion } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { FormTree } from '../FormTree';
import { StudioButton } from '@studio/components';

export type ReceiptContentProps = {
  /**
   * Name of receipt page
   */
  receiptName: string;
  /**
   * The currently open accordion
   */
  selectedAccordion: string;
  /**
   * The list of all form layouts
   */
  formLayoutData: FormLayoutPage[];
  /**
   * To be executed when clicking the accordion
   * @returns void
   */
  onClickAccordion: () => void;
  /**
   * To be executed when clicking add receipt
   * @returns void
   */
  onClickAddPage: () => void;
};

/**
 * @component
 *    Displays the Receipt content. Either a button or an accordion
 *
 * @property {string}[receiptName] - Name of receipt page
 * @property {string}[selectedAccordion] - The currently open accordion
 * @property {FormLayoutPage[]}[formLayoutData] - The list of all form layouts
 * @property {function}[onClickAccordion] - To be executed when clicking the accordion
 * @property {function}[onClickAddPage] - To be executed when clicking add receipt
 *
 * @returns {ReactNode} - The rendered component
 */
export const ReceiptContent = ({
  receiptName,
  selectedAccordion,
  formLayoutData,
  onClickAccordion,
  onClickAddPage,
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
  return (
    <div className={classes.button}>
      <StudioButton variant='tertiary' onClick={onClickAddPage} size='small'>
        {t('receipt.create')}
      </StudioButton>
    </div>
  );
};

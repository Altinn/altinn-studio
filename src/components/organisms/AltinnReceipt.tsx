import React from 'react';
import type { JSX } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { AltinnAttachments } from 'src/components/atoms/AltinnAttachments';
import classes from 'src/components/organisms/AltinnReceipt.module.css';
import { AttachmentGroupings } from 'src/components/organisms/AttachmentGroupings';
import { AltinnSummaryTable } from 'src/components/table/AltinnSummaryTable';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IDisplayAttachment } from 'src/types/shared';

export interface IReceiptComponentProps {
  attachments: IDisplayAttachment[] | undefined;
  body: React.ReactNode;
  collapsibleTitle: React.ReactNode;
  hideCollapsibleCount?: boolean;
  instanceMetaDataObject: SummaryDataObject;
  pdf: IDisplayAttachment[];
  subtitle?: string | JSX.Element | JSX.Element[] | null;
  subtitleurl?: string;
  title: React.ReactNode;
  titleSubmitted: React.ReactNode;
}

export function ReceiptComponent({
  title,
  attachments,
  instanceMetaDataObject,
  subtitle,
  subtitleurl,
  body,
  pdf,
  titleSubmitted,
  collapsibleTitle,
  hideCollapsibleCount,
}: IReceiptComponentProps) {
  return (
    <div
      data-testid='altinn-receipt'
      className={classes.wordBreak}
    >
      <Heading
        level={2}
        size='medium'
      >
        {title}
      </Heading>
      <AltinnSummaryTable summaryDataObject={instanceMetaDataObject} />
      {subtitle && (
        <div className={classes.paddingTop24}>
          <a
            className='altinnLink'
            href={subtitleurl}
          >
            {subtitle}
          </a>
        </div>
      )}

      <div
        id='body-text'
        className={classes.paddingTop24}
      >
        {body}
      </div>
      {pdf && pdf.length > 0 && (
        <>
          {titleSubmitted && (
            <Heading
              level={3}
              size='small'
              style={{
                paddingTop: '2.562rem',
                paddingBottom: '0.3125rem',
              }}
            >
              {titleSubmitted}
            </Heading>
          )}
          <AltinnAttachments
            attachments={pdf}
            id='attachment-list-pdf'
            showLinks={true}
          />
        </>
      )}
      {attachments && (
        <AttachmentGroupings
          attachments={attachments}
          collapsibleTitle={collapsibleTitle}
          hideCollapsibleCount={hideCollapsibleCount}
          showLinks={true}
        />
      )}
    </div>
  );
}

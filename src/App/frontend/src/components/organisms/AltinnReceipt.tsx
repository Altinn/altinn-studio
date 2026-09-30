import React from 'react';
import type { JSX } from 'react';

import { AttachmentGroupings, Attachments } from '@app/form-component';
import { Heading } from '@digdir/designsystemet-react';

import classes from 'src/components/organisms/AltinnReceipt.module.css';
import { AltinnSummaryTable } from 'src/components/table/AltinnSummaryTable';
import { toRenderableAttachments } from 'src/utils/attachmentsUtils';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IDisplayAttachment } from 'src/types/shared';

export interface IReceiptComponentProps {
  attachments: IDisplayAttachment[] | undefined;
  body: React.ReactNode;
  collapsibleTitle: JSX.Element | undefined;
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
        data-size='md'
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
              data-size='sm'
              style={{
                paddingTop: '2.562rem',
                paddingBottom: '0.3125rem',
              }}
            >
              {titleSubmitted}
            </Heading>
          )}
          <Attachments
            attachments={toRenderableAttachments(pdf)}
            id='attachment-list-pdf'
            showLinks={true}
          />
        </>
      )}
      {attachments && (
        <AttachmentGroupings
          attachments={toRenderableAttachments(attachments)}
          title={collapsibleTitle}
          hideCollapsibleCount={hideCollapsibleCount}
          showLinks={true}
        />
      )}
    </div>
  );
}

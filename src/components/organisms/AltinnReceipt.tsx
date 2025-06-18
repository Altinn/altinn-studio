import React from 'react';
import type { JSX } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { AltinnAttachments } from 'src/components/atoms/AltinnAttachments';
import { AltinnCollapsibleAttachments } from 'src/components/molecules/AltinnCollapsibleAttachments';
import classes from 'src/components/organisms/AltinnReceipt.module.css';
import { AltinnSummaryTable } from 'src/components/table/AltinnSummaryTable';
import { useLanguage } from 'src/features/language/useLanguage';
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

interface IRenderAttachmentGroupings {
  attachments: IDisplayAttachment[] | undefined;
  collapsibleTitle: React.ReactNode;
  hideCollapsibleCount?: boolean;
}

const defaultGrouping = 'null'; // Default grouping for attachments without a specific grouping

export const AttachmentGroupings = ({
  attachments,
  collapsibleTitle,
  hideCollapsibleCount,
}: IRenderAttachmentGroupings) => {
  const langTools = useLanguage();
  const groupings = attachments?.reduce<Record<string, IDisplayAttachment[]>>((acc, attachment) => {
    const grouping = attachment.grouping ?? defaultGrouping;
    const translatedGrouping = langTools.langAsString(grouping);
    if (!acc[translatedGrouping]) {
      acc[translatedGrouping] = [];
    }
    acc[translatedGrouping].push(attachment);
    return acc;
  }, {});

  if (!groupings) {
    return null;
  }

  return (
    <>
      {Object.keys(groupings).map((groupTitle, index) => (
        <AltinnCollapsibleAttachments
          key={index}
          attachments={groupings[groupTitle]}
          title={groupTitle === 'null' ? collapsibleTitle : groupTitle}
          hideCount={hideCollapsibleCount}
        />
      ))}
    </>
  );
};

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
          />
        </>
      )}
      {attachments && (
        <AttachmentGroupings
          attachments={attachments}
          collapsibleTitle={collapsibleTitle}
          hideCollapsibleCount={hideCollapsibleCount}
        />
      )}
    </div>
  );
}

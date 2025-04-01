import React, { useEffect, useState } from 'react';
import type { JSX } from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { AltinnAttachments } from 'src/components/atoms/AltinnAttachments';
import { AltinnCollapsibleAttachments } from 'src/components/molecules/AltinnCollapsibleAttachments';
import classes from 'src/components/organisms/AltinnReceipt.module.css';
import { AltinnSummaryTable } from 'src/components/table/AltinnSummaryTable';
import type { SummaryDataObject } from 'src/components/table/AltinnSummaryTable';
import type { IAttachmentGrouping, IDisplayAttachment } from 'src/types/shared';

export interface IReceiptComponentProps {
  attachmentGroupings?: IAttachmentGrouping;
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

interface ICollapsibleAttacments {
  attachments: IDisplayAttachment[];
  title: React.ReactNode;
  hideCollapsibleCount?: boolean;
}

/**
 * Watches the print media query and returns true if the page is being printed
 */
function useIsPrint() {
  const [isPrint, setIsPrint] = useState(() => window.matchMedia('print').matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia('print');
    const handleChange = (event: MediaQueryListEvent) => setIsPrint(event.matches);
    mediaQueryList.addEventListener('change', handleChange);
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, []);

  return isPrint;
}

const CollapsibleAttachments = ({ attachments, title, hideCollapsibleCount }: ICollapsibleAttacments) => {
  const isPrint = useIsPrint() ? false : Boolean(attachments.length > 4);

  return (
    <AltinnCollapsibleAttachments
      attachments={attachments}
      collapsible={isPrint}
      title={title}
      hideCount={hideCollapsibleCount}
    />
  );
};

interface IRenderAttachmentGroupings {
  attachmentGroupings?: IAttachmentGrouping;
  collapsibleTitle: React.ReactNode;
  hideCollapsibleCount?: boolean;
}

const RenderAttachmentGroupings = ({
  attachmentGroupings,
  collapsibleTitle,
  hideCollapsibleCount,
}: IRenderAttachmentGroupings) => {
  const groupings = attachmentGroupings;
  const groups: JSX.Element[] = [];

  if (!groupings) {
    return null;
  }

  if (groupings.null) {
    // we have attachments that does not have a grouping. Render them first with default title
    groups.push(
      <CollapsibleAttachments
        attachments={groupings.null}
        title={collapsibleTitle}
        hideCollapsibleCount={hideCollapsibleCount}
      />,
    );
  }

  Object.keys(groupings || {}).forEach((title: string) => {
    if (title && title !== 'null') {
      groups.push(
        <CollapsibleAttachments
          attachments={groupings[title]}
          title={title}
          hideCollapsibleCount={hideCollapsibleCount}
        />,
      );
    }
  });

  return (
    <>
      {groups.map((element: JSX.Element, index) => (
        <React.Fragment key={index}>{element}</React.Fragment>
      ))}
    </>
  );
};

export function ReceiptComponent({
  title,
  instanceMetaDataObject,
  subtitle,
  subtitleurl,
  body,
  pdf,
  titleSubmitted,
  attachmentGroupings,
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
      {attachmentGroupings && (
        <RenderAttachmentGroupings
          attachmentGroupings={attachmentGroupings}
          collapsibleTitle={collapsibleTitle}
          hideCollapsibleCount={hideCollapsibleCount}
        />
      )}
    </div>
  );
}

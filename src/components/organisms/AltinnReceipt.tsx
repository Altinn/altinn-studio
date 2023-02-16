import React from 'react';

import { makeStyles, Typography } from '@material-ui/core';
import useMediaQuery from '@material-ui/core/useMediaQuery';

import { AltinnAttachment } from 'src/components/atoms/AltinnAttachment';
import { AltinnCollapsibleAttachments } from 'src/components/molecules/AltinnCollapsibleAttachments';
import { AltinnSummaryTable } from 'src/components/molecules/AltinnSummaryTable';
import type { IAttachment, IAttachmentGrouping } from 'src/types/shared';

export interface IReceiptComponentProps {
  attachmentGroupings?: IAttachmentGrouping;
  body: React.ReactNode;
  collapsibleTitle: React.ReactNode;
  hideCollapsibleCount?: boolean;
  instanceMetaDataObject: any;
  pdf?: IAttachment[];
  subtitle?: JSX.Element | JSX.Element[];
  subtitleurl?: string;
  title: React.ReactNode;
  titleSubmitted: React.ReactNode;
}

const useStyles = makeStyles(() => ({
  instanceMetaData: {
    marginTop: 36,
  },
  tableCell: {
    borderBottom: 0,
    paddingRight: '1.5625rem',
  },
  tableRow: {
    height: 'auto',
  },
  paddingTop24: {
    paddingTop: '1.5rem',
  },
  wordBreak: {
    wordBreak: 'break-word',
  },
}));

interface ICollapsibleAttacments {
  attachments: IAttachment[];
  title: React.ReactNode;
  hideCollapsibleCount?: boolean;
}

const CollapsibleAttachments = ({ attachments, title, hideCollapsibleCount }: ICollapsibleAttacments) => {
  const isPrint = useMediaQuery('print') ? false : Boolean(attachments.length > 4);

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
      {groups.map((element: JSX.Element, index) => {
        return <React.Fragment key={index}>{element}</React.Fragment>;
      })}
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
  const classes = useStyles();

  // renders attachment groups. Always shows default group first
  return (
    <div
      data-testid='altinn-receipt'
      className={classes.wordBreak}
    >
      <Typography variant='h2'>{title}</Typography>
      <AltinnSummaryTable summaryDataObject={instanceMetaDataObject} />
      {subtitle && (
        <Typography
          variant='body1'
          className={classes.paddingTop24}
        >
          <a href={subtitleurl}>{subtitle}</a>
        </Typography>
      )}

      <Typography
        id='body-text'
        variant='body1'
        className={classes.paddingTop24}
      >
        {body}
      </Typography>
      {pdf && pdf.length > 0 && (
        <>
          {titleSubmitted && (
            <Typography
              variant='h3'
              style={{
                paddingTop: '2.562rem',
                paddingBottom: '0.3125rem',
                fontWeight: 600,
              }}
            >
              {titleSubmitted}
            </Typography>
          )}
          <AltinnAttachment
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

import { Typography } from '@material-ui/core';
import {
  createTheme,
  createStyles,
  MuiThemeProvider,
  WithStyles,
  withStyles,
} from '@material-ui/core/styles';
import * as React from 'react';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import altinnTheme from '../../theme/altinnAppTheme';
import { IAttachment, IAttachmentGrouping } from '../../types';
import AltinnAttachmentComponent from '../atoms/AltinnAttachment';
import AltinnCollapsibleAttachmentsComponent from '../molecules/AltinnCollapsibleAttachments';
import AltinnSummaryTable from '../molecules/AltinnSummaryTable';

export interface IReceiptComponentProps extends WithStyles<typeof styles> {
  attachmentGroupings?: IAttachmentGrouping;
  body: string;
  collapsibleTitle: string;
  hideCollapsibleCount?: boolean;
  instanceMetaDataObject: any;
  pdf?: IAttachment[];
  subtitle?: boolean;
  subtitleurl?: string;
  title: string;
  titleSubmitted: string;
}

const theme = createTheme(altinnTheme);

const styles = createStyles({
  instanceMetaData: {
    marginTop: 36,
  },
  tableCell: {
    borderBottom: 0,
    paddingRight: '2.5rem',
  },
  tableRow: {
    height: 'auto',
  },
  paddingTop24: {
    paddingTop: '2.4rem',
  },
  wordBreak: {
    wordBreak: 'break-word',
  },
});

interface ICollapsibleAttacments {
  attachments: IAttachment[];
  title: string;
  hideCollapsibleCount?: boolean;
}

const CollapsibleAttachments = ({
  attachments,
  title,
  hideCollapsibleCount,
}: ICollapsibleAttacments) => {
  return (
    <AltinnCollapsibleAttachmentsComponent
      attachments={attachments}
      collapsible={
        useMediaQuery('print') ? false : Boolean(attachments.length > 4)
      }
      title={title}
      hideCount={hideCollapsibleCount}
      key={title}
    />
  );
};

interface IRenderAttachmentGroupings {
  attachmentGroupings?: IAttachmentGrouping;
  collapsibleTitle: string;
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
      {groups.map((element: JSX.Element) => {
        return element;
      })}
    </>
  );
};

export function ReceiptComponent(props: IReceiptComponentProps) {
  // renders attachment groups. Always shows default group first

  return (
    <div className={props.classes.wordBreak}>
      <MuiThemeProvider theme={theme}>
        <Typography variant='h2'>{props.title}</Typography>
        <AltinnSummaryTable summaryDataObject={props.instanceMetaDataObject} />
        {props.subtitle && (
          <Typography variant='body1' className={props.classes.paddingTop24}>
            <a href={props.subtitleurl}>{props.subtitle}</a>
          </Typography>
        )}

        <Typography
          id='body-text'
          variant='body1'
          className={props.classes.paddingTop24}
        >
          {props.body}
        </Typography>
        {props.titleSubmitted && (
          <Typography
            variant='h3'
            style={{
              paddingTop: '4.1rem',
              paddingBottom: '0.5rem',
              fontWeight: 600,
            }}
          >
            {props.titleSubmitted}
          </Typography>
        )}
        <AltinnAttachmentComponent
          attachments={props.pdf}
          id='attachment-list-pdf'
        />
        {props.attachmentGroupings && (
          <RenderAttachmentGroupings
            attachmentGroupings={props.attachmentGroupings}
            collapsibleTitle={props.collapsibleTitle}
            hideCollapsibleCount={props.hideCollapsibleCount}
          />
        )}
      </MuiThemeProvider>
    </div>
  );
}

export default withStyles(styles)(ReceiptComponent);

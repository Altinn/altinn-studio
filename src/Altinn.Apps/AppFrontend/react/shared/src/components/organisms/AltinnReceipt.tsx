/* eslint-disable import/no-named-as-default */
/* eslint-disable react/prop-types */
import { Typography } from '@material-ui/core';
import { createTheme, createStyles, MuiThemeProvider, WithStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import altinnTheme from '../../theme/altinnAppTheme';
import { IAttachment, IAttachmentGrouping } from '../../types';
import AltinnAttachment from '../atoms/AltinnAttachment';
import AltinnCollapsibleAttachments from '../molecules/AltinnCollapsibleAttachments';
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

export function ReceiptComponent(props: IReceiptComponentProps) {
  // renders attachment groups. Always shows default group first
  function RenderAttachmentGroupings(): JSX.Element {
    const groupings = props.attachmentGroupings;
    const groups: JSX.Element[] = [];

    if (!groupings) {
      return null;
    }

    if (groupings.null) {
      // we have attachments that does not have a grouping. Render them first with default title
      groups.push(getAltinnCollapsibleAttachments(groupings.null, props.collapsibleTitle));
    }

    Object.keys(groupings || {}).forEach((title: string) => {
      if (title && title !== 'null') {
        groups.push(getAltinnCollapsibleAttachments(groupings[title], title));
      }
    });

    return (
      <>
        {groups.map((element: JSX.Element) => { return element; })}
      </>
    );
  }

  function getAltinnCollapsibleAttachments(attachments: IAttachment[], title: string) {
    return (
      <AltinnCollapsibleAttachments
        attachments={attachments}
        collapsible={useMediaQuery('print') ? false : Boolean(attachments.length > 4)}
        title={title}
        hideCount={props.hideCollapsibleCount}
        key={title}
      />
    );
  }

  return (
    <div className={props.classes.wordBreak}>
      <MuiThemeProvider theme={theme}>
        <Typography variant='h2'>
          {props.title}
        </Typography>
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
        {props.titleSubmitted &&
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
        }
        <AltinnAttachment
          attachments={props.pdf}
        />
        {props.attachmentGroupings && <RenderAttachmentGroupings/>}

      </MuiThemeProvider>
    </div>
  );
}

export default withStyles(styles)(ReceiptComponent);

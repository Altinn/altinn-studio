import { Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, MuiThemeProvider, WithStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import altinnTheme from '../../theme/altinnAppTheme';
import { IAttachment } from '../../types/index.d';
import AltinnAttachment from '../atoms/AltinnAttachment';
import AltinnCollapsibleAttachments from '../molecules/AltinnCollapsibleAttachments';
import AltinnSummaryTable from '../molecules/AltinnSummaryTable';

export interface IReceiptComponentProps extends WithStyles<typeof styles> {
  attachments?: IAttachment[];
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

const theme = createMuiTheme(altinnTheme);

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
});

export function ReceiptComponent(props: IReceiptComponentProps) {
  return (
    <React.Fragment>
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

        <Typography variant='body1' className={props.classes.paddingTop24}>
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
        {props.attachments && (
          <AltinnCollapsibleAttachments
            attachments={props.attachments}
            collapsible={useMediaQuery('print') ? false : Boolean(props.attachments.length > 4)}
            title={props.collapsibleTitle}
            hideCount={props.hideCollapsibleCount}
          />
        )}

      </MuiThemeProvider>
    </React.Fragment>
  );
}

export default withStyles(styles)(ReceiptComponent);

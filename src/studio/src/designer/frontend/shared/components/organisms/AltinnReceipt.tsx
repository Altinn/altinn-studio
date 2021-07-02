import { Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, MuiThemeProvider, WithStyles, withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import classNames from 'classnames';
import * as React from 'react';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import altinnTheme from '../../theme/altinnAppTheme';
import { IAttachment } from '../../types/index.d';
import AltinnAttachment from '../atoms/AltinnAttachment';
import AltinnCollapsibleAttachments from '../molecules/AltinnCollapsibleAttachments';

export interface IReceiptComponentProps extends WithStyles<typeof styles> {
  attachments?: IAttachment[];
  body: string;
  collapsibleTitle: string;
  instanceMetadataObject: any;
  pdf?: IAttachment[];
  subtitle?: boolean;
  subtitleurl?: string;
  title: string;
  titleSubmitted: string;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  instanceMetadata: {
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
  const returnInstanceMetadataGridRow = (name: string, prop: string, classes: any, index: number) => {
    return (
      <TableRow
        key={index}
        classes={{
          root: classNames(classes.tableRow),
        }}
      >
        <TableCell
          padding='none'
          classes={{
            root: classNames(classes.tableCell),
          }}
        >
          <Typography variant='body1'>
            {name}:
          </Typography>
        </TableCell>
        <TableCell
          padding='none'
          classes={{
            root: classNames(classes.tableCell),
          }}
        >
          <Typography variant='body1'>
            {prop}
          </Typography>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <React.Fragment>
      <MuiThemeProvider theme={theme}>
        <Typography variant='h2'>
          {props.title}
        </Typography>
        <Table
          style={{ height: 'auto', width: 'auto' }}
          padding='none'
          className={props.classes.instanceMetadata}
        >
          <TableBody>
            {Object.keys(props.instanceMetadataObject).map((name, i) => (
              returnInstanceMetadataGridRow(name, props.instanceMetadataObject[name], props.classes, i)
            ))}
          </TableBody>
        </Table>
        {props.subtitle && (
          <Typography variant='body1' className={props.classes.paddingTop24}>
            <a href={props.subtitleurl}>{props.subtitle}</a>
          </Typography>
        )}

        <Typography variant='body1' className={props.classes.paddingTop24}>
          {props.body}
        </Typography>
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
        <AltinnAttachment
          attachments={props.pdf}
        />
        {props.attachments && (
          <AltinnCollapsibleAttachments
            attachments={props.attachments}
            collapsible={useMediaQuery('print') ? false : Boolean(props.attachments.length > 4)}
            title={props.collapsibleTitle}
          />
        )}

      </MuiThemeProvider>
    </React.Fragment>
  );
}

export default withStyles(styles)(ReceiptComponent);

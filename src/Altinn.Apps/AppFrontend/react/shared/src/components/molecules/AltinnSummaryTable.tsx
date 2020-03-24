import * as React from 'react';
import {Table, TableBody, TableRow, TableCell, Typography } from '@material-ui/core';
import classNames from 'classnames';
import { makeStyles } from '@material-ui/styles';

const returnGridRow = (name: string, prop: string, classes: any, index: number) => {
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

const useStyles = makeStyles({
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
});

export interface IAltinnSummaryTableProps {
  summaryDataObject: any;
}

export default function AltinnSummaryTable(props: IAltinnSummaryTableProps) {
  const classes = useStyles();
  return (
    <Table
      style={{ height: 'auto', width: 'auto' }}
      padding='none'
      className={classes.instanceMetaData}
    >
      <TableBody>
        {Object.keys(props.summaryDataObject).map((name, i) => (
          returnGridRow(name, props.summaryDataObject[name], classes, i)
        ))}
      </TableBody>
    </Table>
  )
}
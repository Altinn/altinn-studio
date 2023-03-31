import React from 'react';

import { makeStyles, Table, TableBody, TableCell, TableRow, Typography } from '@material-ui/core';
import classNames from 'classnames';

const returnGridRow = (name: string, prop: string, classes: any, index: number) => (
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
      <Typography variant='body1'>{name}:</Typography>
    </TableCell>
    <TableCell
      padding='none'
      classes={{
        root: classNames(classes.tableCell),
      }}
    >
      <Typography variant='body1'>{prop}</Typography>
    </TableCell>
  </TableRow>
);

const useStyles = makeStyles({
  instanceMetaData: {
    '@media only screen': {
      marginTop: 36,
    },
    '@media print': {
      marginBottom: '1.25rem',
    },
  },
  tableCell: {
    borderBottom: 0,
    paddingRight: '1.5625rem',
  },
  tableRow: {
    height: 'auto',
  },
});

export interface IAltinnSummaryTableProps {
  summaryDataObject: any;
}

export function AltinnSummaryTable(props: IAltinnSummaryTableProps) {
  const classes = useStyles();
  return (
    <Table
      style={{ height: 'auto', width: 'auto' }}
      padding='none'
      className={classes.instanceMetaData}
    >
      <TableBody>
        {Object.keys(props.summaryDataObject).map((name, i) =>
          returnGridRow(name, props.summaryDataObject[name], classes, i),
        )}
      </TableBody>
    </Table>
  );
}

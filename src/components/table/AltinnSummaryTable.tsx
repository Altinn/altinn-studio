import React from 'react';

import { Table, TableBody, TableCell, TableRow, Typography } from '@material-ui/core';
import cn from 'classnames';

import classes from 'src/components/table/AltinnSummaryTable.module.css';

interface InnerRowProps {
  name: string;
  prop: SummaryDataObject[keyof SummaryDataObject];
}

export type SummaryDataObject = {
  [name: string]: {
    value: string | boolean | number | null | undefined;
    hideFromVisualTesting?: boolean;
  };
};

export interface IAltinnSummaryTableProps {
  summaryDataObject: SummaryDataObject;
}

const InnerRow = ({ name, prop }: InnerRowProps) => (
  <TableRow className={classes.tableRow}>
    <TableCell
      padding='none'
      className={classes.tableCell}
    >
      <Typography variant='body1'>{name}:</Typography>
    </TableCell>
    <TableCell
      padding='none'
      className={cn(classes.tableCell, { ['no-visual-testing']: prop.hideFromVisualTesting })}
    >
      <Typography variant='body1'>{prop.value}</Typography>
    </TableCell>
  </TableRow>
);

export const AltinnSummaryTable = (props: IAltinnSummaryTableProps) => (
  <Table className={classes.instanceMetaData}>
    <TableBody>
      {Object.keys(props.summaryDataObject).map((name) => (
        <InnerRow
          key={name}
          name={name}
          prop={props.summaryDataObject[name]}
        />
      ))}
    </TableBody>
  </Table>
);

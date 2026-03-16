import React from 'react';

import cn from 'classnames';

import classes from 'src/components/table/AltinnSummaryTable.module.css';

export type SummaryDataObject = {
  [name: string]: {
    value: string | boolean | number | null | undefined;
    hideFromVisualTesting?: boolean;
  };
};

export interface IAltinnSummaryTableProps {
  summaryDataObject: SummaryDataObject;
}

export const AltinnSummaryTable = ({ summaryDataObject }: IAltinnSummaryTableProps) => (
  <table className={classes.table}>
    <tbody>
      {Object.entries(summaryDataObject).map(([key, value]) => (
        <tr key={key}>
          <td className={classes.key}>{key}:</td>
          <td className={cn({ ['no-visual-testing']: value.hideFromVisualTesting })}>{value.value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

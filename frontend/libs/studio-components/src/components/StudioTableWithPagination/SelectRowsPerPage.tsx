import classes from './StudioTableWithPagination.module.css';
import { Label, NativeSelect } from '@digdir/design-system-react';
import React from 'react';
import { labelSizeMap } from './utils';

type LabelSize = 'small' | 'medium' | 'large' | 'xsmall';

type SelectRowsPerPageProps = {
  setRowPerPage: (value: ((prevState: number) => number) | number) => void;
  size: 'small' | 'medium' | 'large';
};

export const SelectRowsPerPage = ({
  setRowPerPage,
  size,
}: SelectRowsPerPageProps): React.ReactElement => {
  const labelSize = labelSizeMap[size] as LabelSize;

  return (
    <div className={classes.selectorContainer}>
      <NativeSelect
        className={classes.selector}
        name={'rowsPerPage'}
        onChange={(e) => setRowPerPage(Number(e.target.value))}
        size={size}
      >
        <option value='5'>5</option>
        <option value='10'>10</option>
        <option value='20'>20</option>
        <option value='50'>50</option>
        <option value='100'>100</option>
      </NativeSelect>
      <Label htmlFor={'rowsPerPage'} size={labelSize} className={classes.label}>
        Rows per page
      </Label>
    </div>
  );
};

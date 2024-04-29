import classes from './StudioTableControlledInternally.module.css';
import { Label, NativeSelect } from '@digdir/design-system-react';
import React, { useId } from 'react';
import { labelSizeMap } from '../StudioTableRemotePagination/StudioTableRemotePagination';

type SelectRowsPerPageProps = {
  rowPerPageOptions?: number[];
  setRowPerPage: (value: ((prevState: number) => number) | number) => void;
  size: 'small' | 'medium' | 'large';
};

export const SelectRowsPerPage = ({
  rowPerPageOptions = [5, 10, 20, 50, 100],
  setRowPerPage,
  size,
}: SelectRowsPerPageProps): React.ReactElement => {
  const labelId = useId();
  const labelSize = labelSizeMap[size];

  return (
    <div className={classes.selectorContainer}>
      <NativeSelect
        className={classes.selector}
        id={labelId}
        onChange={(e) => setRowPerPage(Number(e.target.value))}
        size={size}
      >
        {rowPerPageOptions.map((row) => (
          <option key={row} value={row}>
            {row}
          </option>
        ))}
      </NativeSelect>
      <Label htmlFor={labelId} size={labelSize} className={classes.label}>
        Rows per page
      </Label>
    </div>
  );
};

import * as React from 'react';

import { RadioGroup, Typography, makeStyles } from '@material-ui/core';

type AltinnRadioGroupProps = {
  id?: any;
  value: any;
  onChange?: any;
  className?: any;
  name?: string;
  row?: boolean;
  description?: string;
  children: React.ReactNode;
};

const useStyles = makeStyles({
  altinnRadioGroup: {
    marginTop: '0rem',
    marginBottom: '0rem',
  },
  altinnRadioGroupWrapper: {
    marginTop: '2.4rem',
  },
  altinnRadioGroupDescription: {
    fontSize: '1.6rem',
  },
});

export const AltinnRadioGroup = ({
  description,
  onChange,
  value,
  className,
  name,
  row,
  id,
  children,
}: AltinnRadioGroupProps) => {
  const classes = useStyles();

  return (
    <div className={classes.altinnRadioGroupWrapper}>
      {description && (
        <Typography classes={{ root: classes.altinnRadioGroupDescription }}>
          {description}
        </Typography>
      )}
      <RadioGroup
        classes={{ root: classes.altinnRadioGroup }}
        onChange={onChange}
        value={value}
        className={className}
        name={name}
        id={id}
        row={row}
      >
        {children}
      </RadioGroup>
    </div>
  );
};

export default AltinnRadioGroup;

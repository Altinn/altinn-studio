import React from 'react';

import classes from 'src/app-components/Date/Date.module.css';

interface DateProps {
  value: React.ReactNode;
  iconUrl?: string;
  iconAltText?: string;
  labelId?: string;
}

export const DisplayDate = ({ value, iconUrl, iconAltText, labelId }: DateProps) => (
  <>
    {iconUrl && (
      <img
        src={iconUrl}
        className={classes.icon}
        alt={iconAltText}
      />
    )}
    <span aria-labelledby={labelId}>{value}</span>
  </>
);

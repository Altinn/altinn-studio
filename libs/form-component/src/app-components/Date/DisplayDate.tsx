import React from 'react';

import classes from './Date.module.css';

export type DisplayDateProps = {
  value: React.ReactNode;
  iconUrl?: string;
  iconAltText?: string;
  labelId?: string;
};

export function DisplayDate({ value, iconUrl, iconAltText, labelId }: DisplayDateProps) {
  return (
    <>
      {iconUrl && <img src={iconUrl} className={classes.icon} alt={iconAltText} />}
      <span aria-labelledby={labelId}>{value}</span>
    </>
  );
}

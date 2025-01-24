import React from 'react';

import classes from 'src/app-components/Text/Text.module.css';

interface TextProps {
  value: string;
  iconUrl?: string;
  iconAltText?: string;
  labelId?: string;
}

export const DisplayText = ({ value, iconUrl, iconAltText, labelId }: TextProps) => (
  <>
    {iconUrl && (
      <img
        src={iconUrl}
        className={classes.icon}
        alt={iconAltText}
      />
    )}
    {labelId && <span aria-labelledby={labelId}>{value}</span>}
    {!labelId && <span>{value}</span>}
  </>
);

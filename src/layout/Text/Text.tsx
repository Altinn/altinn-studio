import React from 'react';

import classes from 'src/layout/Text/Text.module.css';

interface TextProps {
  value: string;
  iconUrl?: string;
  iconAltText?: string;
  labelId?: string;
}

export const Text = ({ value, iconUrl, iconAltText, labelId }: TextProps) => (
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

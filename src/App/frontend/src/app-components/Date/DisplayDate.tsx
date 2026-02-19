import React from 'react';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import classes from 'src/app-components/Date/Date.module.css';

interface DateProps {
  value: React.ReactNode;
  iconUrl?: string;
  iconAltText?: string;
  labelId?: string;
}

export const DisplayDate = ({ value, iconUrl, iconAltText, labelId }: DateProps) => {
  const t = useTranslation();
  return (
    <>
      {iconUrl && (
        <img
          src={iconUrl}
          className={classes.icon}
          alt={iconAltText ? t(iconAltText) : undefined}
        />
      )}
      <span aria-labelledby={labelId}>{value}</span>
    </>
  );
};

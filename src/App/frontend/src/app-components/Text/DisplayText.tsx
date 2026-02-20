import React from 'react';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import classes from 'src/app-components/Text/Text.module.css';

interface TextProps {
  value: string;
  iconUrl?: string;
  iconAltText?: string;
  labelId?: string;
}

export const DisplayText = ({ value, iconUrl, iconAltText, labelId }: TextProps) => {
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
      {labelId && <span aria-labelledby={labelId}>{value}</span>}
      {!labelId && <span>{value}</span>}
    </>
  );
};

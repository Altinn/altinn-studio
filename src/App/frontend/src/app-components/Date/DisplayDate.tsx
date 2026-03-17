import React from 'react';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import classes from 'src/app-components/Date/Date.module.css';
import type { TranslationKey } from 'src/app-components/types';

interface DateProps {
  value: React.ReactNode;
  iconUrl?: string;
  iconAltText?: TranslationKey;
  labelId?: string;
}

export const DisplayDate = ({ value, iconUrl, iconAltText, labelId }: DateProps) => {
  const { translate } = useTranslation();
  return (
    <>
      {iconUrl && (
        <img
          src={iconUrl}
          className={classes.icon}
          alt={iconAltText ? translate(iconAltText) : undefined}
        />
      )}
      <span aria-labelledby={labelId}>{value}</span>
    </>
  );
};

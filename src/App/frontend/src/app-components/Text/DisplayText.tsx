import React from 'react';

import { useTranslation } from 'src/app-components/AppComponentsProvider';
import classes from 'src/app-components/Text/Text.module.css';
import type { TranslationKey } from 'src/app-components/types';

interface TextProps {
  value: string;
  iconUrl?: string;
  iconAltText?: TranslationKey;
  labelId?: string;
}

export const DisplayText = ({ value, iconUrl, iconAltText, labelId }: TextProps) => {
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
      {labelId && <span aria-labelledby={labelId}>{value}</span>}
      {!labelId && <span>{value}</span>}
    </>
  );
};

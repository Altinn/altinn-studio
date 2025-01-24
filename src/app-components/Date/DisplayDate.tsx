import React from 'react';

import { formatDate, isValid, parseISO } from 'date-fns';

import classes from 'src/app-components/Date/Date.module.css';

interface DateProps {
  format?: string;
  value: string;
  iconUrl?: string;
  iconAltText?: string;
  labelId?: string;
}

export const DisplayDate = ({ value, format, iconUrl, iconAltText, labelId }: DateProps) => {
  const parsedValue = parseISO(value);
  let displayData = parsedValue.toDateString();
  if (!isValid(parsedValue)) {
    window.logErrorOnce(`Ugyldig datoformat gitt til Date-komponent: "${value}"`);
    displayData = '';
  } else if (format) {
    displayData = formatDate(parsedValue, format);
  }

  return (
    <>
      {iconUrl && (
        <img
          src={iconUrl}
          className={classes.icon}
          alt={iconAltText}
        />
      )}
      {labelId && <span aria-labelledby={labelId}>{displayData}</span>}
      {!labelId && <span>{displayData}</span>}
    </>
  );
};

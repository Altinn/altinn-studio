import React from 'react';

import { formatDate, isValid, parseISO } from 'date-fns';

import classes from 'src/layout/Date/Date.module.css';

interface DateProps {
  format?: string;
  value: string;
  iconUrl?: string;
  iconAltText?: string;
  labelId?: string;
}

export const Date = ({ value, format, iconUrl, iconAltText, labelId }: DateProps) => {
  const parsedValue = parseISO(value);
  let displayData = parsedValue.toDateString();
  if (!isValid(parsedValue)) {
    displayData = 'Ugyldig format';
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
      <span aria-labelledby={labelId}>{displayData}</span>
    </>
  );
};

import React from 'react';
import classes from './ResourceTableDataChip.module.css';

interface Props {
  hasPolicy: boolean;
}

export const ResourceTableDataChip = ({ hasPolicy }: Props) => {
  return (
    <div className={hasPolicy ? classes.hasPolicy : classes.noPolicy}>
      <p>{hasPolicy ? 'Har policy' : 'Mangler policy'}</p>
    </div>
  );
};

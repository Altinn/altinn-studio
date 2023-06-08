import React from 'react';
import classes from './ResourceTableDataChip.module.css';

interface Props {
  hasPolicy: boolean;
}

/**
 * Displays a blue or grey chip inside a table row based on if the
 * resource has a policy or not.
 *
 * @param props.hasPolicy boolean for if the resource has a policy or not
 */
export const ResourceTableDataChip = ({ hasPolicy }: Props) => {
  // TODO - translation
  return (
    <div className={hasPolicy ? classes.hasPolicy : classes.noPolicy}>
      <p>{hasPolicy ? 'Har policy' : 'Mangler policy'}</p>
    </div>
  );
};

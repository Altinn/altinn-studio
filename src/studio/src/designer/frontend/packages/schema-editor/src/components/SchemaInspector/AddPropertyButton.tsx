import IconButton from '@material-ui/core/IconButton';
import React, { BaseSyntheticEvent } from 'react';

export interface IAddPropertyButtonProps {
  onAddPropertyClick: (event: BaseSyntheticEvent) => void;
  label: string;
}
export function AddPropertyButton({ onAddPropertyClick, label }: IAddPropertyButtonProps) {
  return (
    <IconButton id='add-property-button' aria-label='Add property' onClick={onAddPropertyClick}>
      <i className='fa fa-plus' />
      {label}
    </IconButton>
  );
}

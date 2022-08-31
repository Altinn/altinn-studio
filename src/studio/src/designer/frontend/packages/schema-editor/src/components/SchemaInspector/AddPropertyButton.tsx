import IconButton from '@material-ui/core/IconButton';
import * as React from 'react';

export interface IAddPropertyButtonProps {
  onAddPropertyClick: (event: React.BaseSyntheticEvent) => void;
  label: string;
}
export function AddPropertyButton({
  onAddPropertyClick,
  label,
}: IAddPropertyButtonProps) {
  return (
    <IconButton
      id='add-property-button'
      aria-label='Add property'
      onClick={onAddPropertyClick}
    >
      <i className='fa fa-plus' />
      {label}
    </IconButton>
  );
}

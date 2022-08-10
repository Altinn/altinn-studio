import IconButton from '@material-ui/core/IconButton';
import * as React from 'react';
import { ILanguage } from '../types';
import { getTranslation } from '../utils/language';

export interface IAddPropertyButtonProps {
  onAddPropertyClick: (event: React.BaseSyntheticEvent) => void;
  language: ILanguage;
}
export function AddPropertyButton ({
  onAddPropertyClick,
  language
}: IAddPropertyButtonProps) {
  return (
    <IconButton
      id='add-property-button'
      aria-label='Add property'
      onClick={onAddPropertyClick}
    >
      <i className='fa fa-plus' />
      {getTranslation('add_property', language)}
    </IconButton>
  );
}

import React from 'react';
import { StudioProperty } from '@studio/components';
import { LinkIcon } from '@studio/icons';
import classes from './DefinedBinding.module.css';
import { useTranslation } from 'react-i18next';

export type DefinedBindingProps = {
  onClick: () => void;
  label: string;
  selectedOption: string;
};

export const DefinedBinding = ({ onClick, label, selectedOption }: DefinedBindingProps) => {
  const { t } = useTranslation();
  const title = t('right_menu.dataModelBindings_edit', { binding: label });

  const value = (
    <span className={classes.selectedOption}>
      <LinkIcon /> {selectedOption}
    </span>
  );

  return (
    <StudioProperty.Button
      aria-label={title}
      onClick={onClick}
      property={label}
      title={title}
      value={value}
    />
  );
};

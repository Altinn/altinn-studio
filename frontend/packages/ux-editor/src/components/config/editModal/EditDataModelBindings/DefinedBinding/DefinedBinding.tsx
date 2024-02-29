import React from 'react';
import { StudioButton } from '@studio/components';
import { LinkIcon, PencilIcon } from '@studio/icons';
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
  return (
    <StudioButton
      aria-label={title}
      className={classes.definedBinding}
      fullWidth
      onClick={onClick}
      size='small'
      title={title}
      variant='tertiary'
    >
      <span className={classes.mainContent}>
        <strong>{label}</strong>
        <span className={classes.selectedOption}>
          <LinkIcon /> {selectedOption}
        </span>
      </span>
      <span className={classes.pencilIcon}>
        <PencilIcon />
      </span>
    </StudioButton>
  );
};

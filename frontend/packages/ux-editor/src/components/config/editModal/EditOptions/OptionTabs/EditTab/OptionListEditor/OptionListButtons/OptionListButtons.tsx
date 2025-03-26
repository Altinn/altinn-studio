import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components-legacy';
import { PencilIcon, TrashIcon } from '@studio/icons';
import classes from './OptionListButtons.module.css';

type OptionListButtonsProps = {
  handleDelete: () => void;
  handleClick: () => void;
};

export function OptionListButtons({
  handleDelete,
  handleClick,
}: OptionListButtonsProps): React.ReactNode {
  const { t } = useTranslation();

  return (
    <div className={classes.buttonContainer}>
      <StudioButton
        icon={<PencilIcon />}
        variant='secondary'
        onClick={handleClick}
        title={t('ux_editor.modal_properties_code_list_open_editor')}
      >
        {t('general.edit')}
      </StudioButton>
      <StudioButton
        color='danger'
        icon={<TrashIcon />}
        variant='secondary'
        onClick={handleDelete}
        title={t('ux_editor.options.option_remove_text')}
      >
        {t('general.delete')}
      </StudioButton>
    </div>
  );
}

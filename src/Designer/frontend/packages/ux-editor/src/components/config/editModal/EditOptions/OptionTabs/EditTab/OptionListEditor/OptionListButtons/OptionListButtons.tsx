import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components-legacy';
import { PencilIcon, TrashIcon } from 'libs/studio-icons/src';
import classes from './OptionListButtons.module.css';

type OptionListButtonsProps = {
  onDeleteButtonClick: () => void;
  onEditButtonClick: () => void;
};

export function OptionListButtons({
  onDeleteButtonClick,
  onEditButtonClick,
}: OptionListButtonsProps): React.ReactNode {
  const { t } = useTranslation();

  return (
    <div className={classes.buttonContainer}>
      <StudioButton
        icon={<PencilIcon />}
        variant='secondary'
        onClick={onEditButtonClick}
        title={t('ux_editor.modal_properties_code_list_open_editor')}
      >
        {t('general.edit')}
      </StudioButton>
      <StudioButton
        color='danger'
        icon={<TrashIcon />}
        variant='secondary'
        onClick={onDeleteButtonClick}
        title={t('ux_editor.options.option_remove_text')}
      >
        {t('general.delete')}
      </StudioButton>
    </div>
  );
}

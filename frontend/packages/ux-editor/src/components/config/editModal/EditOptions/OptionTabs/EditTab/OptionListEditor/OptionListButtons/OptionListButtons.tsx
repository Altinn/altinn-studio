import type { Option } from 'app-shared/types/Option';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import { PencilIcon, TrashIcon } from '@studio/icons';
import type { OptionListEditorProps } from '../OptionListEditor';
import classes from './OptionListButtons.module.css';

type OptionListButtonsProps = {
  optionsList: Option[];
  handleDelete: () => void;
  handleClick: () => void;
} & Pick<OptionListEditorProps, 'component'>;

export function OptionListButtons({
  handleDelete,
  handleClick,
}: OptionListButtonsProps): React.ReactNode {
  const { t } = useTranslation();

  return (
    <div className={classes.buttonContainer}>
      <StudioButton icon={<PencilIcon />} variant='secondary' onClick={handleClick}>
        {t('general.edit')}
      </StudioButton>
      <StudioButton color='danger' icon={<TrashIcon />} variant='secondary' onClick={handleDelete}>
        {t('general.delete')}
      </StudioButton>
    </div>
  );
}

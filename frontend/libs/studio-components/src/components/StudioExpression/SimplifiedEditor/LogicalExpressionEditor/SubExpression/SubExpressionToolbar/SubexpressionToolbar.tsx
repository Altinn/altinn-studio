import React, { useContext } from 'react';
import { StudioButton } from '../../../../../StudioButton';
import { StudioDeleteButton } from '../../../../../StudioDeleteButton';
import { FloppydiskIcon, PencilIcon } from '@studio/icons';
import classes from './SubexpressionToolbar.module.css';
import { StudioExpressionContext } from '../../../../StudioExpressionContext';

export type SubexpressionToolbarProps = {
  isInEditMode: boolean;
  onSave: () => void;
  onDelete: () => void;
  onEnableEditMode: () => void;
};

export const SubexpressionToolbar = ({
  isInEditMode,
  onSave,
  onDelete,
  onEnableEditMode,
}: SubexpressionToolbarProps) => {
  const { texts } = useContext(StudioExpressionContext);

  return (
    <div className={classes.subexpressionToolbar} role='toolbar'>
      {isInEditMode ? (
        <StudioButton
          color='success'
          icon={<FloppydiskIcon />}
          onClick={onSave}
          size='small'
          variant='primary'
        >
          {texts.saveAndClose}
        </StudioButton>
      ) : (
        <StudioButton
          icon={<PencilIcon />}
          onClick={onEnableEditMode}
          size='small'
          variant='secondary'
        >
          {texts.edit}
        </StudioButton>
      )}
      <StudioDeleteButton
        onDelete={onDelete}
        confirmMessage={texts.confirmDeleteSubexpression}
        size='small'
      >
        {texts.delete}
      </StudioDeleteButton>
    </div>
  );
};

import React from 'react';
import { StudioButton } from '../../../../../StudioButton';
import { StudioDeleteButton } from '../../../../../StudioDeleteButton';
import { FloppydiskIcon, PencilIcon } from '@studio/icons';
import classes from './SubexpressionToolbar.module.css';
import { useStudioExpressionContext } from '../../../../StudioExpressionContext';

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
}: SubexpressionToolbarProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();

  return (
    <div className={classes.subexpressionToolbar} role='toolbar'>
      {isInEditMode ? (
        <StudioButton color='success' icon={<FloppydiskIcon />} onClick={onSave} variant='primary'>
          {texts.saveAndClose}
        </StudioButton>
      ) : (
        <StudioButton icon={<PencilIcon />} onClick={onEnableEditMode} variant='secondary'>
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

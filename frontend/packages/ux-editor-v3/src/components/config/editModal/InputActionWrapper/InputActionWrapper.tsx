import React, { useEffect, useState } from 'react';
import { CheckmarkIcon, TrashIcon, PencilWritingIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import type { ButtonProps } from '@digdir/designsystemet-react';
import classes from './InputActionWrapper.module.css';
import { StudioButton } from '@studio/components';

type AvailableAction = 'edit' | 'save' | 'delete';
export type ActionGroup = 'editMode' | 'hoverMode' | 'standBy';

const actionGroupMap: Record<ActionGroup, AvailableAction[]> = {
  editMode: ['save', 'delete'],
  hoverMode: ['edit'],
  standBy: [],
};

const actionToIconMap: Record<AvailableAction, React.ReactNode> = {
  edit: <PencilWritingIcon />,
  save: <CheckmarkIcon />,
  delete: <TrashIcon />,
};

export type InputActionWrapperProps = {
  children: React.ReactElement;
  mode?: ActionGroup;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onSaveClick: () => void;
};

export const InputActionWrapper = ({
  mode,
  children,
  onEditClick,
  onDeleteClick,
  onSaveClick,
  ...rest
}: InputActionWrapperProps): JSX.Element => {
  const { t } = useTranslation();
  const defaultActions = actionGroupMap[mode || 'standBy'];
  const [actions, setActions] = useState<AvailableAction[]>(defaultActions);

  useEffect(() => {
    setActions(defaultActions);
  }, [defaultActions]);

  const handleFocus = (): void => {
    setActions(actionGroupMap['editMode']);
  };

  const handleBlur = (): void => {
    setActions(actionGroupMap['standBy']);
  };

  const handleMouseLeave = (): void => {
    const isEditMode = actions.includes('save');
    if (isEditMode) return;
    handleBlur();
  };

  const handleActionClick = (action: AvailableAction): void => {
    switch (action) {
      case 'delete':
        onDeleteClick();
        break;
      case 'save':
        onSaveClick();
        handleBlur();
        break;
      case 'edit':
        onEditClick();
        setActions(actionGroupMap['editMode']);
      default:
        break;
    }
  };

  const handleHover = (): void => {
    const isInStandByMode = mode === 'standBy';
    if (isInStandByMode) {
      setActions(actionGroupMap['hoverMode']);
    }
  };

  const actionToAriaLabelMap: Record<AvailableAction, string> = {
    edit: t('general.edit'),
    delete: t('general.delete'),
    save: t('general.save'),
  };

  const actionToColorMap: Record<AvailableAction, ButtonProps['color']> = {
    edit: 'first',
    save: 'success',
    delete: 'danger',
  };

  return (
    <div
      className={mode === 'standBy' ? classes.preview : classes.edit}
      onMouseOver={handleHover}
      onMouseLeave={handleMouseLeave}
    >
      {React.cloneElement(children, {
        ...rest,
        onFocus: handleFocus,
      })}
      <div className={classes.buttonWrapper}>
        {actions.map((action) => (
          <StudioButton
            variant={mode === 'standBy' ? 'tertiary' : 'secondary'}
            color={actionToColorMap[action]}
            key={action}
            onClick={() => handleActionClick(action)}
            aria-label={actionToAriaLabelMap[action]}
          >
            {actionToIconMap[action]}
          </StudioButton>
        ))}
      </div>
    </div>
  );
};

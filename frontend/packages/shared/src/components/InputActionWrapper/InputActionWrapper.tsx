import React, { useEffect, useState } from 'react';
import { CheckmarkIcon, TrashIcon, PencilWritingIcon } from '@altinn/icons';
import { useText } from '../../../../ux-editor/src/hooks/index';
import { Button, ButtonProps } from '@digdir/design-system-react';
import classes from './InputActionWrapper.module.css';
import cn from 'classnames';

type AvailableAction = 'edit' | 'save' | 'delete';
export type ActionGroup = 'editMode' | 'hoverMode' | 'standBy';

const actionGroupMap: Record<ActionGroup, AvailableAction[]> = {
  editMode: ['save', 'delete'],
  hoverMode: ['edit', 'delete'],
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
  const t = useText();
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
      className={cn(classes.container, mode === 'standBy' && classes.standByContainer)}
      onMouseOver={handleHover}
      onMouseLeave={handleMouseLeave}
    >
      {React.cloneElement(children, {
        ...rest,
        onFocus: handleFocus,
      })}
      <div
        className={cn(classes.buttonWrapper, mode === 'standBy' && classes.standByButtonWrapper)}
      >
        {actions.map((action) => (
          <Button
            variant='tertiary'
            size='medium'
            color={actionToColorMap[action]}
            key={action}
            onClick={() => handleActionClick(action)}
            aria-label={actionToAriaLabelMap[action]}
          >
            {actionToIconMap[action]}
          </Button>
        ))}
      </div>
    </div>
  );
};

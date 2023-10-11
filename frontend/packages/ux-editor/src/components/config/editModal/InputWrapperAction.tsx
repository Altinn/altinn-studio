import React, { useState } from 'react';
import { TrashIcon, FloppydiskIcon, PencilIcon } from '@altinn/icons';

type AvailableAction = 'edit' | 'save' | 'delete';
export type ActionGroup = 'editMode' | 'hoverMode' | 'standBy';

// Group of actions based on the situations like editMode, hoverMode or standby
const actionGroupMap: Record<ActionGroup, AvailableAction[]> = {
  editMode: ['save', 'delete'],
  hoverMode: ['edit', 'delete'],
  standBy: [],
};

// Maps the action (save, edit, delete) to correnct icon
const actionToIconMap: Record<AvailableAction, React.ReactNode> = {
  edit: <PencilIcon />,
  save: <FloppydiskIcon />,
  delete: <TrashIcon />,
};

// Map Actions (save, edit, delete) to correct aria-label for screen readers.
const actionToAriaLabelMap: Record<AvailableAction, string> = {
  edit: 'Rediger',
  delete: 'Slett',
  save: 'Lagre',
};

type InputWrapperActionProps = {
  children: React.ReactElement;
  defaultAction?: ActionGroup;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onSaveClick: () => void;
};
export const InputWrapperAction = ({
  defaultAction = 'standBy',
  children,
  onEditClick,
  onDeleteClick,
  onSaveClick,
  ...rest
}: InputWrapperActionProps): JSX.Element => {
  const [actions, setActions] = useState<AvailableAction[]>(actionGroupMap[defaultAction]);

  const handleFocus = (): void => {
    setActions(actionGroupMap['editMode']);
  };

  const handleBlur = (): void => {
    setActions(actionGroupMap['standBy']);
  };

  const handleActionClick = (action: AvailableAction): void => {
    if (action === 'delete') {
      onDeleteClick();
      return;
    }

    if (action === 'save') {
      onSaveClick();
      handleBlur();
      return;
    }

    if (action === 'edit') {
      onEditClick();
      setActions(actionGroupMap['editMode']);
      return;
    }
  };

  const handleHover = (): void => {
    // HoverMode should only be set to the input-field if it is in standbyMode
    const isInStandByMode = actions.length === actionGroupMap['standBy'].length;
    if (isInStandByMode) {
      setActions(actionGroupMap['hoverMode']);
    }
  };

  return (
    <div onMouseOver={handleHover} onMouseLeave={handleBlur}>
      {/* React.cloneElement is cloning the children element, to be enabled to add props to it, like onFocus */}
      {React.cloneElement(children, {
        ...rest,
        onFocus: handleFocus,
      })}
      {actions.map((action) => (
        <button
          key={action}
          onClick={() => handleActionClick(action)}
          aria-label={actionToAriaLabelMap[action]}
        >
          {actionToIconMap[action]}
        </button>
      ))}
    </div>
  );
};

import React from 'react';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { AddSubformModal } from './AddSubformModal';
import { useSelectLayoutSet } from './useSelectLayoutSet';

type EditLayoutSetProps = {
  existingLayoutSetForSubform: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
};

export const EditLayoutSet = ({
  existingLayoutSetForSubform,
  onUpdateLayoutSet,
}: EditLayoutSetProps): React.ReactElement => {
  const addSubformDialogRef = React.useRef<HTMLDialogElement>(null);

  const { isLayoutSetSelectorVisible, setIsLayoutSetSelectorVisible, renderSelectLayoutSet } =
    useSelectLayoutSet(existingLayoutSetForSubform, onUpdateLayoutSet);

  function openAddSubformDialog() {
    addSubformDialogRef.current?.showModal();
  }

  if (isLayoutSetSelectorVisible) return renderSelectLayoutSet;

  const layoutSetIsUndefined = !existingLayoutSetForSubform;
  if (layoutSetIsUndefined) {
    openAddSubformDialog();
    return (
      <AddSubformModal
        ref={addSubformDialogRef}
        existingLayoutSetForSubform={existingLayoutSetForSubform}
        onUpdateLayoutSet={onUpdateLayoutSet}
      />
    );
  }

  return (
    <DefinedLayoutSet
      existingLayoutSetForSubForm={existingLayoutSetForSubform}
      onClick={() => setIsLayoutSetSelectorVisible(true)}
    />
  );
};

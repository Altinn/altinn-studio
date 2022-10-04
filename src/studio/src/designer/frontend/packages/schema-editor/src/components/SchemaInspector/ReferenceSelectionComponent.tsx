import React from 'react';
import { ClassNameMap } from '@material-ui/core/styles/withStyles';
import { RefSelect } from './RefSelect';
import type { UiSchemaNode } from '@altinn/schema-model';

export interface IReferenceSelectionProps {
  buttonText: string;
  classes: ClassNameMap;
  label: string;
  onChangeRef: (refPointer: string, value: string) => void;
  onGoToDefButtonClick: () => void;
  selectedNode: UiSchemaNode;
}

export function ReferenceSelectionComponent({
  classes,
  selectedNode,
  label,
  buttonText,
  onChangeRef,
  onGoToDefButtonClick,
}: IReferenceSelectionProps) {
  const common = {
    label,
    nodePointer: selectedNode.pointer,
    fullWidth: true,
  };
  return (
    <div>
      <RefSelect
        {...common}
        value={selectedNode.ref ?? ''}
        onChange={(value) => onChangeRef(selectedNode.pointer, value)}
      />
      <button type='button' className={classes.navButton} onClick={onGoToDefButtonClick}>
        {buttonText}
      </button>
    </div>
  );
}

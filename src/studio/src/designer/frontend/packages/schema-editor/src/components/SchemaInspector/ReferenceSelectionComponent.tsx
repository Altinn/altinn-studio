import React from 'react';
import { ClassNameMap } from '@material-ui/core/styles/withStyles';
import { RefSelect } from './RefSelect';
import type { UiSchemaNode } from '@altinn/schema-model';
import { FieldType, ObjectKind } from '@altinn/schema-model';

export interface IReferenceSelectionProps {
  arrayType: string | FieldType | undefined;
  buttonText: string;
  classes: ClassNameMap;
  label: string;
  objectKind: ObjectKind;
  onChangeArrayType: (type: string) => void;
  onChangeRef: (refPointer: string) => void;
  onGoToDefButtonClick: () => void;
  selectedItem: UiSchemaNode;
}

export function ReferenceSelectionComponent({
  arrayType,
  classes,
  selectedItem,
  objectKind,
  label,
  buttonText,
  onChangeArrayType,
  onChangeRef,
  onGoToDefButtonClick,
}: IReferenceSelectionProps) {
  if (!(selectedItem && objectKind === ObjectKind.Reference)) {
    return null;
  }
  const common = {
    label,
    nodePointer: selectedItem.pointer,
    fullWidth: true,
  };
  return (
    <div>
      {selectedItem.fieldType === FieldType.Array ? (
        <RefSelect {...common} value={arrayType ?? ''} onChange={onChangeArrayType} />
      ) : (
        <RefSelect {...common} value={selectedItem.ref ?? ''} onChange={onChangeRef} />
      )}
      <button type='button' className={classes.navButton} onClick={onGoToDefButtonClick}>
        {buttonText}
      </button>
    </div>
  );
}

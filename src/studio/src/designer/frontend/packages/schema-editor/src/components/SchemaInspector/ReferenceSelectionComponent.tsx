import React from 'react';
import { ClassNameMap } from '@material-ui/core/styles/withStyles';
import { FieldType, UiSchemaItem } from '../../types';
import { ObjectKind } from '../../types/enums';
import { RefSelect } from './RefSelect';

export interface IReferenceSelectionProps {
  arrayType: string | FieldType | undefined;
  buttonText: string;
  classes: ClassNameMap;
  label: string;
  objectKind: ObjectKind;
  onChangeArrayType: (type: string | FieldType | undefined) => void;
  onChangeRef: (path: string, ref: string) => void;
  onGoToDefButtonClick: () => void;
  selectedItem: UiSchemaItem | null;
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

  return (
    <div>
      <label htmlFor={selectedItem.path}>{label}</label>
      {selectedItem.type === FieldType.Array ? (
        <RefSelect id={selectedItem.path} value={arrayType ?? ''} onChange={onChangeArrayType} fullWidth={true} />
      ) : (
        <RefSelect id={selectedItem.path} value={selectedItem.$ref ?? ''} onChange={onChangeRef} fullWidth={true} />
      )}
      <button type='button' className={classes.navButton} onClick={onGoToDefButtonClick}>
        {buttonText}
      </button>
    </div>
  );
}

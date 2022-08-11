import { ClassNameMap } from '@material-ui/core/styles/withStyles';
import * as React from 'react';
import type { ILanguage, UiSchemaItem, FieldType } from '../types';
import { ObjectKind } from '../types/enums';
import { getTranslation } from '../utils/language';
import { RefSelect } from './RefSelect';

export interface IReferenceSelectionProps {
  arrayType: string | FieldType | undefined;
  classes: ClassNameMap;
  selectedItem: UiSchemaItem | null;
  objectKind: ObjectKind;
  language: ILanguage;
  onChangeArrayType: (type: string | FieldType | undefined) => void;
  onChangeRef: (path: string, ref: string) => void;
  onGoToDefButtonClick: () => void;
}

export function ReferenceSelectionComponent({
  arrayType,
  classes,
  selectedItem,
  objectKind,
  language,
  onChangeArrayType,
  onChangeRef,
  onGoToDefButtonClick,
}: IReferenceSelectionProps) {

  if (!(selectedItem && objectKind === ObjectKind.Reference)) {
    return null;
  }

  return (
    <div>
      <p className={classes.header}>
        {getTranslation('reference_to', language)}
      </p>
      {selectedItem.type === 'array' ? (
        <RefSelect
          id={selectedItem.path}
          value={arrayType ?? ''}
          onChange={onChangeArrayType}
          fullWidth={true}
        />
      ) : (
        <RefSelect
          id={selectedItem.path}
          value={selectedItem.$ref ?? ''}
          onChange={onChangeRef}
          fullWidth={true}
        />
      )}
      <button
        type='button'
        className={classes.navButton}
        onClick={onGoToDefButtonClick}
      >
        {getTranslation('go_to_type', language)}
      </button>
    </div>
  );
}

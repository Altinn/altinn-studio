import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { Select } from '../common/Select';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import { useSelector } from 'react-redux';
import { ISchemaState } from '../../types';
import { getRootNodes, Keywords } from '@altinn/schema-model';
import classes from './ReferenceSelectionComponent.module.css';

export interface IReferenceSelectionProps {
  buttonText: string;
  emptyOptionLabel: string;
  label: string;
  onChangeRef: (refPointer: string, value: string) => void;
  onGoToDefButtonClick: () => void;
  selectedNode: UiSchemaNode;
}

export function ReferenceSelectionComponent({
  emptyOptionLabel,
  selectedNode,
  label,
  buttonText,
  onChangeRef,
  onGoToDefButtonClick,
}: IReferenceSelectionProps) {
  const definitions: UiSchemaNode[] = useSelector((state: ISchemaState) => getRootNodes(state.uiSchema, true));
  return (
    <div>
      <Select
        emptyOptionLabel={emptyOptionLabel}
        id={getDomFriendlyID(selectedNode.pointer, 'ref-select')}
        label={label}
        onChange={(value) => onChangeRef(selectedNode.pointer, value)}
        options={definitions.map(({ pointer }) => (
          {
            value: pointer,
            label: pointer.replace(`#/${Keywords.Definitions}/`, '')
          }
        ))}
        value={selectedNode.ref || ''}
      />
      <button type='button' className={classes.navButton} onClick={onGoToDefButtonClick}>
        {buttonText}
      </button>
    </div>
  );
}

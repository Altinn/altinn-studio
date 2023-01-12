import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import { useSelector } from 'react-redux';
import type { ISchemaState } from '../../types';
import { getRootNodes, Keywords } from '@altinn/schema-model';
import classes from './ReferenceSelectionComponent.module.css';
import { Select } from '@digdir/design-system-react';

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
  const definitions: UiSchemaNode[] = useSelector((state: ISchemaState) =>
    getRootNodes(state.uiSchema, true)
  );
  const selectId = getDomFriendlyID(selectedNode.pointer, { suffix: 'ref-select' });
  const emptyOption = { label: emptyOptionLabel, value: '' };
  return (
    <div>
      <Select
        inputId={selectId}
        label={label}
        onChange={(value: string) => onChangeRef(selectedNode.pointer, value)}
        options={[
          emptyOption,
          ...definitions.map(({ pointer }) => ({
            value: pointer,
            label: pointer.replace(`#/${Keywords.Definitions}/`, ''),
          })),
        ]}
        value={selectedNode.ref || ''}
      />
      <button type='button' className={classes.navButton} onClick={onGoToDefButtonClick}>
        {buttonText}
      </button>
    </div>
  );
}

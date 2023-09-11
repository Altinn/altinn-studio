import React from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import { getRootNodes, Keyword } from '@altinn/schema-model';
import classes from './ReferenceSelectionComponent.module.css';
import { Select } from '@digdir/design-system-react';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export interface IReferenceSelectionProps {
  buttonText: string;
  emptyOptionLabel: string;
  label: string;
  onChangeRef: (refPointer: string, value: string) => void;
  onGoToDefButtonClick: () => void;
  selectedNode: { pointer: string; reference?: string };
}

export function ReferenceSelectionComponent({
  emptyOptionLabel,
  selectedNode,
  label,
  buttonText,
  onChangeRef,
  onGoToDefButtonClick,
}: IReferenceSelectionProps) {
  const { data } = useSchemaEditorAppContext();
  const definitions: UiSchemaNode[] = getRootNodes(data, true);
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
            label: pointer.replace(`#/${Keyword.Definitions}/`, ''),
          })),
        ]}
        value={selectedNode.reference || ''}
      />
      <button type='button' className={classes.navButton} onClick={onGoToDefButtonClick}>
        {buttonText}
      </button>
    </div>
  );
}

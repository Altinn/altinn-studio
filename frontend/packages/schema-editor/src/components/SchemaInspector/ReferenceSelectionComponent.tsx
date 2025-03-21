import React from 'react';
import type { ReferenceNode, UiSchemaNode } from '@altinn/schema-model';
import { makeDomFriendlyID } from '../../utils/ui-schema-utils';
import { Keyword } from '@altinn/schema-model';
import classes from './ReferenceSelectionComponent.module.css';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { StudioNativeSelect } from '@studio/components-legacy';

export interface IReferenceSelectionProps {
  buttonText: string;
  label: string;
  onChangeRef: (refPointer: string, value: string) => void;
  onGoToDefButtonClick: () => void;
  selectedNode: ReferenceNode;
}

export function ReferenceSelectionComponent({
  selectedNode,
  label,
  buttonText,
  onChangeRef,
  onGoToDefButtonClick,
}: IReferenceSelectionProps) {
  const { schemaModel } = useSchemaEditorAppContext();
  const definitions: UiSchemaNode[] = schemaModel.getDefinitions();
  const selectId = makeDomFriendlyID(selectedNode.schemaPointer, { suffix: 'ref-select' });
  return (
    <div>
      <StudioNativeSelect
        id={selectId}
        label={label}
        onChange={(event) => onChangeRef(selectedNode.schemaPointer, event.target.value)}
        value={selectedNode.reference || ''}
        size='sm'
      >
        {definitions.map(({ schemaPointer }) => (
          <option key={schemaPointer} value={schemaPointer}>
            {schemaPointer.replace(`#/${Keyword.Definitions}/`, '')}
          </option>
        ))}
      </StudioNativeSelect>
      <button type='button' className={classes.navButton} onClick={onGoToDefButtonClick}>
        {buttonText}
      </button>
    </div>
  );
}

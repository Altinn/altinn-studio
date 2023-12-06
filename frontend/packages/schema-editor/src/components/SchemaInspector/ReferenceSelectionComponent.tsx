import React from 'react';
import type { ReferenceNode, UiSchemaNode } from '@altinn/schema-model';
import { makeDomFriendlyID } from '../../utils/ui-schema-utils';
import { Keyword } from '@altinn/schema-model';
import classes from './ReferenceSelectionComponent.module.css';
import { Select } from '@digdir/design-system-react';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

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
  const selectId = makeDomFriendlyID(selectedNode.pointer, { suffix: 'ref-select' });
  return (
    <div>
      <Select
        inputId={selectId}
        label={label}
        onChange={(value: string) => onChangeRef(selectedNode.pointer, value)}
        options={definitions.map(({ pointer }) => ({
          value: pointer,
          label: pointer.replace(`#/${Keyword.Definitions}/`, ''),
        }))}
        value={selectedNode.reference || ''}
      />
      <button type='button' className={classes.navButton} onClick={onGoToDefButtonClick}>
        {buttonText}
      </button>
    </div>
  );
}

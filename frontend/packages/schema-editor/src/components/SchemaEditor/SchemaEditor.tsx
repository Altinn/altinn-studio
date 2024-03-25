import React from 'react';
import classes from './SchemaEditor.module.css';
import { TypesInspector } from '../TypesInspector';
import { SchemaInspector } from '../SchemaInspector';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { ROOT_POINTER } from '@altinn/schema-model';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { useMoveProperty } from './hooks/useMoveProperty';
import { useAddReference } from './hooks/useAddReference';
import { NodePanel } from '../NodePanel';

export const SchemaEditor = () => {
  const { schemaModel, selectedTypePointer } = useSchemaEditorAppContext();
  const moveProperty = useMoveProperty();
  const addReference = useAddReference();
  console.log(moveProperty);

  if (schemaModel.isEmpty()) return null;
  const definitions: UiSchemaNodes = schemaModel.getDefinitions();
  const selectedType = selectedTypePointer && schemaModel.getNode(selectedTypePointer);

  return (
    <>
      <DragAndDropTree.Provider
        onAdd={addReference}
        onMove={(pointer, position) =>
          // The listItemContext is not updated at the correct time, and useParentId is not working as expected in cases when drag and drop in schema tree for types
          // Following issue may fix this: https://github.com/Altinn/altinn-studio/issues/11824
          moveProperty(pointer, {
            index: position.index,
            parentId: selectedTypePointer || position.parentId,
          })
        }
        rootId={ROOT_POINTER}
      >
        <aside className={classes.inspector}>
          <TypesInspector schemaItems={definitions} />
        </aside>
        <div className={classes.editor}>
          <NodePanel pointer={selectedType?.pointer} />
        </div>
      </DragAndDropTree.Provider>
      <aside className={classes.inspector}>
        <SchemaInspector />
      </aside>
    </>
  );
};

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

  if (schemaModel.isEmpty()) return null;
  const definitions: UiSchemaNodes = schemaModel.getDefinitions();
  const selectedType = selectedTypePointer && schemaModel.getNode(selectedTypePointer);

  return (
    <>
      <DragAndDropTree.Provider
        onAdd={addReference}
        onMove={(pointer, position) =>
          // listItemContext update timing may affect useParentId functionality. For now, use selectedTypePointer as parentId if set, else use parentId from position object
          // Refactor may provide a better solution: https://github.com/Altinn/altinn-studio/issues/11824
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

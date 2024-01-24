import React, { useEffect, useState } from 'react';
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
  const { schemaModel, selectedTypePointer, selectedNodePointer } = useSchemaEditorAppContext();
  const moveProperty = useMoveProperty();
  const addReference = useAddReference();

  const [expandedPropNodes, setExpandedPropNodes] = useState<string[]>([]);
  const [expandedDefNodes, setExpandedDefNodes] = useState<string[]>([]);

  const selectedPropertyParent = schemaModel.getParentNode(selectedNodePointer);

  useEffect(() => {
    if (selectedPropertyParent && !expandedPropNodes.includes(selectedPropertyParent.pointer)) {
      setExpandedPropNodes((prevState) => [...prevState, selectedPropertyParent.pointer]);
    }
  }, [selectedPropertyParent, expandedPropNodes]);

  const selectedDefinitionParent = schemaModel.getParentNode(selectedTypePointer);
  useEffect(() => {
    if (selectedDefinitionParent && !expandedDefNodes.includes(selectedDefinitionParent.pointer)) {
      setExpandedDefNodes((prevState) => [...prevState, selectedDefinitionParent.pointer]);
    }
  }, [selectedPropertyParent, expandedDefNodes, selectedDefinitionParent]);

  if (schemaModel.isEmpty()) return null;
  const definitions: UiSchemaNodes = schemaModel.getDefinitions();
  const selectedType = selectedTypePointer && schemaModel.getNode(selectedTypePointer);

  return (
    <>
      <DragAndDropTree.Provider onAdd={addReference} onMove={moveProperty} rootId={ROOT_POINTER}>
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

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
import { StudioResizableLayout } from '@studio/components';
import { useUserQuery } from 'app-development/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const SchemaEditor = () => {
  const { schemaModel, selectedTypePointer, selectedUniquePointer } = useSchemaEditorAppContext();
  const { org } = useStudioEnvironmentParams();
  const { data: user } = useUserQuery();
  const moveProperty = useMoveProperty();
  const addReference = useAddReference();

  if (schemaModel.isEmpty()) return null;
  const definitions: UiSchemaNodes = schemaModel.getDefinitions();
  const selectedType =
    selectedTypePointer && schemaModel.getNodeBySchemaPointer(selectedTypePointer);

  return (
    <DragAndDropTree.Provider
      onAdd={addReference}
      onMove={moveProperty}
      rootId={ROOT_POINTER}
      itemId={selectedTypePointer ?? null}
      key={selectedType?.pointer}
    >
      <StudioResizableLayout.Container
        orientation='horizontal'
        localStorageContext={`datamodel:${user.id}:${org}`}
      >
        <StudioResizableLayout.Element minimumSize={100} maximumSize={280}>
          <aside className={classes.inspector}>
            <TypesInspector schemaItems={definitions} />
          </aside>
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element>
          <div className={classes.editor}>
            <NodePanel pointer={selectedType?.pointer} />
          </div>
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element
          minimumSize={300}
          collapsed={!selectedUniquePointer}
          collapsedSize={180}
        >
          <aside className={classes.inspector}>
            <SchemaInspector />
          </aside>
        </StudioResizableLayout.Element>
      </StudioResizableLayout.Container>
    </DragAndDropTree.Provider>
  );
};

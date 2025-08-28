import React from 'react';
import classes from './SchemaEditor.module.css';
import { TypesInspector } from '../TypesInspector';
import { SchemaInspector } from '../SchemaInspector';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { ROOT_POINTER } from '@altinn/schema-model';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { useMoveProperty } from './hooks/useMoveProperty';
import { useAddReference } from './hooks/useAddReference';
import { NodePanel } from '../NodePanel';
import { StudioResizableLayout, StudioDragAndDropTree } from '@studio/components-legacy';
import { useUserQuery } from 'app-development/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const SchemaEditor = () => {
  const { schemaModel, selectedTypePointer } = useSchemaEditorAppContext();
  const { org } = useStudioEnvironmentParams();
  const { data: user } = useUserQuery();
  const moveProperty = useMoveProperty();
  const addReference = useAddReference();
  const definitions: UiSchemaNodes = schemaModel.getDefinitions();
  const selectedType =
    selectedTypePointer && schemaModel.getNodeBySchemaPointer(selectedTypePointer);

  return (
    <StudioDragAndDropTree.Provider
      onAdd={addReference}
      onMove={moveProperty}
      rootId={ROOT_POINTER}
      itemId={selectedTypePointer ?? null}
      key={selectedType?.schemaPointer}
    >
      <StudioResizableLayout.Container
        orientation='horizontal'
        localStorageContext={`datamodel:${user.id}:${org}`}
      >
        <StudioResizableLayout.Element minimumSize={200} maximumSize={500}>
          <aside className={classes.inspector}>
            <TypesInspector schemaItems={definitions} />
          </aside>
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element minimumSize={250}>
          <div className={classes.editor}>
            <NodePanel schemaPointer={selectedType?.schemaPointer} />
          </div>
        </StudioResizableLayout.Element>
        <StudioResizableLayout.Element minimumSize={300}>
          <aside className={classes.inspector}>
            <SchemaInspector />
          </aside>
        </StudioResizableLayout.Element>
      </StudioResizableLayout.Container>
    </StudioDragAndDropTree.Provider>
  );
};

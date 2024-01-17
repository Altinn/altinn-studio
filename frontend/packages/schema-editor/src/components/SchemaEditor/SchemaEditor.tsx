import React, { useEffect, useState } from 'react';
import classes from './SchemaEditor.module.css';
import { useTranslation } from 'react-i18next';
import { TypesInspector } from '../TypesInspector';
import classNames from 'classnames';
import { StudioButton } from '@studio/components';
import { XMarkIcon } from '@navikt/aksel-icons';
import { ModelsPanel, TypesPanel } from '../layout';
import { SchemaInspector } from '../SchemaInspector';
import { extractNameFromPointer, ROOT_POINTER, UiSchemaNodes } from '@altinn/schema-model';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { useMoveProperty } from './hooks/useMoveProperty';
import { useAddReference } from './hooks/useAddReference';

export const SchemaEditor = () => {
  const { schemaModel, selectedTypePointer, setSelectedTypePointer, selectedNodePointer, setSelectedNodePointer } = useSchemaEditorAppContext();
  const moveProperty = useMoveProperty();
  const addReference = useAddReference();

  const { t } = useTranslation();

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

  const handleResetSelectedType = () => {
    setSelectedTypePointer(null);
    setSelectedNodePointer(undefined);
  };

  const definitions: UiSchemaNodes = schemaModel.getDefinitions();
  const selectedType = selectedTypePointer && schemaModel.getNode(selectedTypePointer);

  return (
    <>
      <DragAndDropTree.Provider onAdd={addReference} onMove={moveProperty} rootId={ROOT_POINTER}>
        <aside className={classes.inspector}>
          <TypesInspector schemaItems={definitions} />
        </aside>
        {selectedType ? (
          <div id='types-editor' className={classNames(classes.editor, classes.editorTypes)}>
            <div className={classes.typeInfo}>
              <span>
                {t('schema_editor.types_editing', {
                  type: extractNameFromPointer(selectedTypePointer),
                })}
              </span>
              <StudioButton
                onClick={handleResetSelectedType}
                icon={<XMarkIcon />}
                variant='tertiary'
                color='inverted'
                aria-label={t('schema_editor.close_type')}
                size='small'
              />
            </div>
            <TypesPanel uiSchemaNode={selectedType}/>
          </div>
        ) : (
          <div id='schema-editor' className={classes.editor}>
            <ModelsPanel />
          </div>
        )}
      </DragAndDropTree.Provider>
      <aside className={classes.inspector}>
        <SchemaInspector />
      </aside>
    </>
  );
};

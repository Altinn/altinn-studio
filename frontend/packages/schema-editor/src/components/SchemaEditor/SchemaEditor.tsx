import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import classes from './SchemaEditor.module.css';
import { setSchemaName, setSelectedId, setUiSchema } from '../../features/editor/schemaEditorSlice';
import { useTranslation } from 'react-i18next';
import { TypesInspector } from '../TypesInspector';
import classNames from 'classnames';
import { Button } from '@digdir/design-system-react';
import { XMarkIcon } from '@navikt/aksel-icons';
import { ModelsPanel, TypesPanel } from '../layout';
import { SchemaInspector } from '../SchemaInspector';
import { extractNameFromPointer, ROOT_POINTER, UiSchemaNodes } from '@altinn/schema-model';
import { useSchemaAndReduxSelector } from '../../hooks/useSchemaAndReduxSelector';
import {
  selectedDefinitionParentSelector,
  selectedPropertyParentSelector,
} from '../../selectors/schemaAndReduxSelectors';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { useMoveProperty } from './hooks/useMoveProperty';
import { useAddReference } from './hooks/useAddReference';

export interface SchemaEditorProps {
  modelName?: string;
}

export const SchemaEditor = ({ modelName }: SchemaEditorProps) => {
  const dispatch = useDispatch();
  const { schemaModel, selectedTypePointer, setSelectedTypePointer } = useSchemaEditorAppContext();
  const moveProperty = useMoveProperty();
  const addReference = useAddReference();

  useEffect(() => {
    if (modelName) {
      dispatch(setUiSchema({ name: modelName }));
      dispatch(setSchemaName({ name: modelName }));
    }
  }, [dispatch, modelName]);

  const { t } = useTranslation();

  const [expandedPropNodes, setExpandedPropNodes] = useState<string[]>([]);
  const [expandedDefNodes, setExpandedDefNodes] = useState<string[]>([]);

  const selectedPropertyParent = useSchemaAndReduxSelector(selectedPropertyParentSelector);

  useEffect(() => {
    if (selectedPropertyParent && !expandedPropNodes.includes(selectedPropertyParent.pointer)) {
      setExpandedPropNodes((prevState) => [...prevState, selectedPropertyParent.pointer]);
    }
  }, [selectedPropertyParent, expandedPropNodes]);

  const selectedDefinitionParent = useSchemaAndReduxSelector(selectedDefinitionParentSelector);
  useEffect(() => {
    if (selectedDefinitionParent && !expandedDefNodes.includes(selectedDefinitionParent.pointer)) {
      setExpandedDefNodes((prevState) => [...prevState, selectedDefinitionParent.pointer]);
    }
  }, [selectedPropertyParent, expandedDefNodes, selectedDefinitionParent]);

  if (schemaModel.isEmpty()) return null;

  const handleResetSelectedType = () => {
    setSelectedTypePointer(null);
    dispatch(setSelectedId({ pointer: '' }));
  };

  const definitions: UiSchemaNodes = schemaModel.getDefinitions();
  const selectedType = definitions.find((item) => item.pointer === selectedTypePointer);

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
              <Button
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

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { XMarkIcon } from '@navikt/aksel-icons';
import { AltinnSpinner } from 'app-shared/components';
import type { SchemaState } from '../types';
import classes from './SchemaEditor.module.css';
import {
  setJsonSchema,
  setSaveSchemaUrl,
  setSchemaName,
  setSelectedId,
  setUiSchema,
  updateJsonSchema,
} from '../features/editor/schemaEditorSlice';
import { SchemaInspector } from './SchemaInspector';
import { TopToolbar } from './TopToolbar';
import { getNameFromPointer, UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  getChildNodesByPointer,
  getNodeByPointer,
  pointerIsDefinition,
  ROOT_POINTER,
} from '@altinn/schema-model';

import { createSelector } from '@reduxjs/toolkit';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { ModelsPanel, TypesPanel } from './layout';
import { useTranslation } from 'react-i18next';
import { TypesInspector } from './TypesInspector';
import classNames from 'classnames';
import { GenerateSchemaState } from 'app-shared/types/global';
import {
  selectedDefinitionParentSelector,
  selectedItemSelector,
  selectedPropertyParentSelector
} from '@altinn/schema-editor/selectors/schemaStateSelectors';
import type { JsonSchema } from 'app-shared/types/JsonSchema';

export interface IEditorProps {
  Toolbar: JSX.Element;
  LandingPagePanel: JSX.Element;
  loading?: boolean;
  name?: string;
  onSaveSchema: (payload: any) => void;
  saveUrl: string;
  schema: JsonSchema;
  schemaState: GenerateSchemaState;
  editMode: boolean;
  toggleEditMode: () => void;
}

const rootNodesSelector = createSelector(
  (state: SchemaState) => state.uiSchema,
  (uiSchema) => {
    const nodesmap = new Map();
    if (uiSchema.length) {
      getChildNodesByPointer(uiSchema, ROOT_POINTER).forEach((node) => {
        nodesmap.set(node.pointer, node);
      });
    }
    return nodesmap;
  }
);

const rootChildrenSelector = createSelector(
  (state: SchemaState) => state.uiSchema,
  (uiSchema) => {
    if (uiSchema.length) {
      return getNodeByPointer(uiSchema, ROOT_POINTER).children;
    } else {
      return undefined;
    }
  }
);
export enum SchemaEditorTestIds {
  menuAddReference = 'action-menu-add-reference',
  menuAddField = 'action-menu-add-field',
  menuAddCombination = 'action-menu-add-combination',
  menuAddString = 'action-menu-add-string',
  menuAddInteger = 'action-menu-add-integer',
  menuAddNumber = 'action-menu-add-number',
  menuAddBoolean = 'action-menu-add-boolean',
}

export const SchemaEditor = ({
  Toolbar,
  LandingPagePanel,
  loading,
  schema,
  schemaState,
  onSaveSchema,
  saveUrl,
  name,
  editMode,
  toggleEditMode,
}: IEditorProps) => {
  const dispatch = useDispatch();
  useEffect(() => {
    if (name && schema) {
      dispatch(setJsonSchema({ schema }));
      dispatch(setUiSchema({ name }));
      dispatch(setSchemaName({ name }));
      dispatch(setSaveSchemaUrl({ saveUrl }));
    }
  }, [dispatch, schema, name, saveUrl]);

  const [expandedPropNodes, setExpandedPropNodes] = useState<string[]>([]);
  const [expandedDefNodes, setExpandedDefNodes] = useState<string[]>([]);

  const [selectedType, setSelectedType] = useState<UiSchemaNode>(null);

  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);

  const rootNodeMap = useSelector(rootNodesSelector);
  const rootChildren = useSelector(rootChildrenSelector);
  const properties: UiSchemaNodes = [];
  const definitions: UiSchemaNodes = [];
  rootChildren?.forEach((childPointer) =>
    pointerIsDefinition(childPointer)
      ? definitions.push(rootNodeMap.get(childPointer))
      : properties.push(rootNodeMap.get(childPointer))
  );

  const selectedPropertyParent = useSelector(selectedPropertyParentSelector);
  const selectedItem = useSelector(selectedItemSelector);

  useEffect(() => {
    if (selectedType) {
      setSelectedType(rootNodeMap.get(selectedType.pointer));
    }
  }, [rootNodeMap, selectedType]);

  useEffect(() => {
    if (selectedItem && pointerIsDefinition(selectedItem.pointer)) {
      setSelectedType(selectedItem);
    }
  }, [selectedItem]);

  useEffect(() => {
    if (selectedPropertyParent && !expandedPropNodes.includes(selectedPropertyParent.pointer)) {
      setExpandedPropNodes((prevState) => [...prevState, selectedPropertyParent.pointer]);
    }
  }, [selectedPropertyParent, expandedPropNodes]);

  const selectedDefinitionParent = useSelector(selectedDefinitionParentSelector);
  useEffect(() => {
    if (selectedDefinitionParent && !expandedDefNodes.includes(selectedDefinitionParent.pointer)) {
      setExpandedDefNodes((prevState) => [...prevState, selectedDefinitionParent.pointer]);
    }
  }, [selectedPropertyParent, expandedDefNodes, selectedDefinitionParent]);

  const handleSaveSchema = () => dispatch(updateJsonSchema({ onSaveSchema }));

  const handleSelectType = (node: UiSchemaNode) => {
    setSelectedType(node);
    dispatch(setSelectedId({ pointer: node.pointer }));
  };

  const handleResetSelectedType = () => {
    setSelectedType(null);
    dispatch(setSelectedId({ pointer: '' }));
  };

  const loadingIndicator = loading ? <AltinnSpinner spinnerText={t('general.loading')} /> : null;
  return (
    <div className={classes.root}>
      <TopToolbar
        Toolbar={Toolbar}
        saveAction={name ? handleSaveSchema : undefined}
        toggleEditMode={name ? toggleEditMode : undefined}
        editMode={editMode}
        schema={schema}
        schemaState={schemaState}
      />
      <main className={classes.main}>
        {LandingPagePanel}
        {schema && (
          <aside className={classes.inspector}>
            <TypesInspector
              schemaItems={definitions}
              handleSelectType={handleSelectType}
              key={selectedType?.pointer || ''}
              selectedNodePointer={selectedType?.pointer}
            />
          </aside>
        )}
        {name && schema && selectedType && (
          <div
            data-testid='types-editor'
            id='types-editor'
            className={classNames(classes.editor, classes.editorTypes)}
          >
            <div className={classes.typeInfo}>
              <span>
                {`${t('types_editing')} ${getNameFromPointer({
                  pointer: selectedType.pointer,
                })}`}
              </span>
              <Button
                onClick={handleResetSelectedType}
                icon={<XMarkIcon />}
                variant={ButtonVariant.Quiet}
                color={ButtonColor.Inverted}
              />
            </div>
            <TypesPanel
              editMode={editMode}
              uiSchemaNode={selectedType}
              setExpandedDefNodes={setExpandedDefNodes}
              expandedDefNodes={
                expandedDefNodes.includes(selectedType?.pointer)
                  ? expandedDefNodes
                  : expandedDefNodes.concat([selectedType.pointer])
              }
            />
          </div>
        )}
        {name && schema && !selectedType ? (
          <div data-testid='schema-editor' id='schema-editor' className={classes.editor}>
            <ModelsPanel
              editMode={editMode}
              setExpandedPropNodes={setExpandedPropNodes}
              expandedPropNodes={expandedPropNodes}
              properties={properties}
            />
          </div>
        ) : (
          loadingIndicator
        )}
        {schema && editMode && (
          <aside className={classes.inspector}>
            <SchemaInspector selectedItem={selectedItem} key={selectedItem?.pointer || ''} />
          </aside>
        )}
      </main>
    </div>
  );
};

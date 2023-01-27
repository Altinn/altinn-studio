import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AltinnSpinner } from 'app-shared/components';
import type { IJsonSchema, ILanguage, ISchemaState } from '../types';
import classes from './SchemaEditor.module.css';
import {
  setJsonSchema,
  setSaveSchemaUrl,
  setSchemaName,
  setSelectedTab,
  setUiSchema,
  updateJsonSchema,
} from '../features/editor/schemaEditorSlice';
import { getTranslation } from '../utils/language';
import { SchemaInspector } from './SchemaInspector';
import { TopToolbar } from './TopToolbar';
import { getLanguageFromKey } from 'app-shared/utils/language';
import type { UiSchemaNodes } from '@altinn/schema-model';
import {
  getChildNodesByPointer,
  getNodeByPointer,
  getParentNodeByPointer,
  pointerIsDefinition,
  ROOT_POINTER,
} from '@altinn/schema-model';

import { createSelector } from '@reduxjs/toolkit';
import { Tabs } from '@digdir/design-system-react';
import { ModelsPanel, TypesPanel } from './layout';

export interface IEditorProps {
  Toolbar: JSX.Element;
  LandingPagePanel: JSX.Element;
  language: ILanguage;
  loading?: boolean;
  name?: string;
  onSaveSchema: (payload: any) => void;
  saveUrl: string;
  schema: IJsonSchema;
  editMode: boolean;
  toggleEditMode: () => void;
}

const rootNodesSelector = createSelector(
  (state: ISchemaState) => state.uiSchema,
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
  (state: ISchemaState) => state.uiSchema,
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
  onSaveSchema,
  saveUrl,
  name,
  language,
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

  const selectedEditorTab = useSelector((state: ISchemaState) => state.selectedEditorTab);

  const selectedPropertyParent = useSelector((state: ISchemaState) =>
    getParentNodeByPointer(state.uiSchema, state.selectedPropertyNodeId)
  );
  useEffect(() => {
    if (selectedPropertyParent && !expandedPropNodes.includes(selectedPropertyParent.pointer)) {
      setExpandedPropNodes((prevState) => [...prevState, selectedPropertyParent.pointer]);
    }
  }, [selectedPropertyParent, expandedPropNodes]);

  const selectedDefinitionParent = useSelector((state: ISchemaState) =>
    getParentNodeByPointer(state.uiSchema, state.selectedDefinitionNodeId)
  );
  useEffect(() => {
    if (selectedDefinitionParent && !expandedDefNodes.includes(selectedDefinitionParent.pointer)) {
      setExpandedDefNodes((prevState) => [...prevState, selectedDefinitionParent.pointer]);
    }
  }, [selectedPropertyParent, expandedDefNodes, selectedDefinitionParent]);

  const handleSaveSchema = () => dispatch(updateJsonSchema({ onSaveSchema }));

  const handleTabChanged = (value: 'definitions' | 'properties') =>
    dispatch(setSelectedTab({ selectedTab: value }));

  const loadingIndicator = loading ? (
    <AltinnSpinner spinnerText={getLanguageFromKey('general.loading', language)} />
  ) : null;

  const t = (key: string) => getTranslation(key, language);

  const selectedId = useSelector((state: ISchemaState) =>
    state.selectedEditorTab === 'properties'
      ? state.selectedPropertyNodeId
      : state.selectedDefinitionNodeId
  );
  const selectedItem = useSelector((state: ISchemaState) =>
    selectedId ? getNodeByPointer(state.uiSchema, selectedId) : undefined
  );
  const rootNodeMap = useSelector(rootNodesSelector);
  const rootChildren = useSelector(rootChildrenSelector);
  const properties: UiSchemaNodes = [];
  const definitions: UiSchemaNodes = [];
  rootChildren?.forEach((childPointer) =>
    pointerIsDefinition(childPointer)
      ? definitions.push(rootNodeMap.get(childPointer))
      : properties.push(rootNodeMap.get(childPointer))
  );

  return (
    <div className={classes.root}>
      <TopToolbar
        Toolbar={Toolbar}
        language={language}
        saveAction={name ? handleSaveSchema : undefined}
        toggleEditMode={name ? toggleEditMode : undefined}
        editMode={editMode}
      />
      <main className={classes.main}>
        {LandingPagePanel}
        {name && schema ? (
          <div data-testid='schema-editor' id='schema-editor' className={classes.editor}>
            <Tabs
              activeTab={selectedEditorTab}
              items={[
                {
                  name: t('model'),
                  content: (
                    <ModelsPanel
                      language={language}
                      editMode={editMode}
                      setExpandedPropNodes={setExpandedPropNodes}
                      expandedPropNodes={expandedPropNodes}
                      properties={properties}
                    />
                  ),
                  value: 'properties',
                },
                {
                  name: t('types'),
                  content: (
                    <TypesPanel
                      language={language}
                      editMode={editMode}
                      definitions={definitions}
                      setExpandedDefNodes={setExpandedDefNodes}
                      expandedDefNodes={expandedDefNodes}
                    />
                  ),
                  value: 'definitions',
                },
              ]}
              onChange={handleTabChanged}
            />
          </div>
        ) : (
          loadingIndicator
        )}
        {schema && editMode && (
          <aside className={classes.inspector}>
            <SchemaInspector
              language={language}
              selectedItem={selectedItem}
              key={selectedItem?.pointer || ''}
            />
          </aside>
        )}
      </main>
    </div>
  );
};

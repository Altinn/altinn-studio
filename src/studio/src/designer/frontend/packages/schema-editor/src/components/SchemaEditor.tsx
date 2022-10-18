import React, { ChangeEvent, MouseEvent, useEffect, useState } from 'react';
import { TabContext, TabList, TabPanel } from '@material-ui/lab';
import { useDispatch, useSelector } from 'react-redux';
import { AppBar, Button, Typography } from '@material-ui/core';
import { AltinnSpinner } from 'app-shared/components';
import type { IJsonSchema, ILanguage, ISchemaState } from '../types';
import classes from './SchemaEditor.module.css';
import {
  addRootItem,
  setJsonSchema,
  setSaveSchemaUrl,
  setSchemaName,
  setSelectedTab,
  setUiSchema,
  updateJsonSchema,
} from '../features/editor/schemaEditorSlice';
import { getTranslation } from '../utils/language';
import { SchemaInspector } from './SchemaInspector';
import { SchemaTab } from './common/SchemaTab';
import { TopToolbar } from './TopToolbar';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { SchemaTreeView } from './TreeView/SchemaTreeView';
import {
  CombinationKind,
  FieldType,
  getChildNodesByPointer,
  getNodeByPointer,
  getParentNodeByPointer,
  Keywords,
  makePointer,
  ObjectKind,
  pointerIsDefinition,
  ROOT_POINTER,
  UiSchemaNode,
  UiSchemaNodes,
} from '@altinn/schema-model';
import { IconImage } from './common/Icon';
import { ActionMenu } from './common/ActionMenu';
import { createSelector } from '@reduxjs/toolkit';

export interface IEditorProps {
  Toolbar: JSX.Element;
  LandingPagePanel: JSX.Element;
  language: ILanguage;
  loading?: boolean;
  name?: string;
  onSaveSchema: (payload: any) => void;
  saveUrl: string,
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
  },
);

const rootChildrenSelector = createSelector(
  (state: ISchemaState) => state.uiSchema,
  (uiSchema) => {
    if (uiSchema.length) {
      return getNodeByPointer(uiSchema, ROOT_POINTER).children;
    } else {
      return undefined;
    }
  },
);

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

  const selectedPropertyNodeId = useSelector((state: ISchemaState) => state.selectedPropertyNodeId);
  const selectedPropertyParent = useSelector((state: ISchemaState) =>
    getParentNodeByPointer(state.uiSchema, state.selectedPropertyNodeId),
  );
  useEffect(() => {
    if (selectedPropertyParent && !expandedPropNodes.includes(selectedPropertyParent.pointer)) {
      setExpandedPropNodes((prevState) => [...prevState, selectedPropertyParent.pointer]);
    }
  }, [selectedPropertyParent, expandedPropNodes]);

  const selectedDefinitionNodeId = useSelector((state: ISchemaState) => state.selectedDefinitionNodeId);
  const selectedDefinitionParent = useSelector((state: ISchemaState) =>
    getParentNodeByPointer(state.uiSchema, state.selectedDefinitionNodeId),
  );
  useEffect(() => {
    if (selectedDefinitionParent && !expandedDefNodes.includes(selectedDefinitionParent.pointer)) {
      setExpandedDefNodes((prevState) => [...prevState, selectedDefinitionParent.pointer]);
    }
  }, [selectedPropertyParent, expandedDefNodes]);

  const handlePropertiesNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) => setExpandedPropNodes(nodeIds);

  const handleDefinitionsNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) => setExpandedDefNodes(nodeIds);

  const handleSaveSchema = () => dispatch(updateJsonSchema({ onSaveSchema }));

  const handleTabChanged = (_x: ChangeEvent<unknown>, value: 'definitions' | 'properties') =>
    dispatch(setSelectedTab({ selectedTab: value }));

  const handleAddProperty = (objectKind: ObjectKind, fieldType?: FieldType) => {
    const newNode: Partial<UiSchemaNode> = { objectKind };
    if (objectKind === ObjectKind.Field) {
      newNode.fieldType = fieldType ?? FieldType.Object;
    }
    if (objectKind === ObjectKind.Combination) {
      newNode.fieldType = CombinationKind.AllOf;
    }
    newNode.ref = objectKind === ObjectKind.Reference ? '' : undefined;
    dispatch(
      addRootItem({
        name: 'name',
        location: makePointer(Keywords.Properties),
        props: newNode,
      }),
    );
  };

  const handleAddDefinition = (e: MouseEvent) => {
    e.stopPropagation();
    dispatch(
      addRootItem({
        name: 'name',
        location: makePointer(Keywords.Definitions),
        props: { fieldType: FieldType.Object },
      }),
    );
  };

  const loadingIndicator = loading ? (
    <AltinnSpinner spinnerText={getLanguageFromKey('general.loading', language)} />
  ) : null;

  const t = (key: string) => getTranslation(key, language);

  const selectedId = useSelector((state: ISchemaState) =>
    state.selectedEditorTab === 'properties' ? state.selectedPropertyNodeId : state.selectedDefinitionNodeId,
  );
  const selectedItem = useSelector((state: ISchemaState) =>
    selectedId ? getNodeByPointer(state.uiSchema, selectedId) : undefined,
  );
  const rootNodeMap = useSelector(rootNodesSelector);
  const rootChildren = useSelector(rootChildrenSelector);
  const properties: UiSchemaNodes = [];
  const definitions: UiSchemaNodes = [];
  rootChildren?.forEach((childPointer) =>
    pointerIsDefinition(childPointer)
      ? definitions.push(rootNodeMap.get(childPointer))
      : properties.push(rootNodeMap.get(childPointer)),
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
            <TabContext value={selectedEditorTab}>
              <AppBar position='static' color='default' className={classes.appBar}>
                <TabList onChange={handleTabChanged} aria-label='model-tabs'>
                  <SchemaTab label={t('model')} value='properties' />
                  <SchemaTab label={t('types')} value='definitions' />
                </TabList>
              </AppBar>
              <TabPanel className={classes.tabPanel} value='properties'>
                {editMode && (
                  <ActionMenu
                    className={classes.addMenu}
                    items={[
                      {
                        action: () => handleAddProperty(ObjectKind.Field),
                        icon: IconImage.Object,
                        text: t('field'),
                      },
                      {
                        action: () => handleAddProperty(ObjectKind.Reference),
                        icon: IconImage.Reference,
                        text: t('reference'),
                      },
                      {
                        action: () => handleAddProperty(ObjectKind.Combination),
                        icon: IconImage.Combination,
                        text: t('combination'),
                      },
                      {
                        action: () => handleAddProperty(ObjectKind.Field, FieldType.String),
                        className: classes.dividerAbove,
                        icon: IconImage.String,
                        text: t('string'),
                      },
                      {
                        action: () => handleAddProperty(ObjectKind.Field, FieldType.Integer),
                        icon: IconImage.Number,
                        text: t('integer'),
                      },
                      {
                        action: () => handleAddProperty(ObjectKind.Field, FieldType.Number),
                        icon: IconImage.Number,
                        text: t('number'),
                      },
                      {
                        action: () => handleAddProperty(ObjectKind.Field, FieldType.Boolean),
                        icon: IconImage.Boolean,
                        text: t('boolean'),
                      },
                    ]}
                    openButtonText={t('add')}
                  />
                )}
                <SchemaTreeView
                  editMode={editMode}
                  expanded={expandedPropNodes}
                  items={properties}
                  translate={t}
                  onNodeToggle={handlePropertiesNodeExpanded}
                  selectedPointer={selectedPropertyNodeId}
                  isPropertiesView={true}
                />
              </TabPanel>
              <TabPanel className={classes.tabPanel} value='definitions'>
                {editMode && (
                  <Button
                    startIcon={<i className='fa fa-plus' />}
                    onClick={handleAddDefinition}
                    className={classes.addButton}
                    classes={{ startIcon: classes.startIcon }}
                  >
                    <Typography variant='body1'>{t('add_element')}</Typography>
                  </Button>
                )}
                <SchemaTreeView
                  editMode={editMode}
                  expanded={expandedDefNodes}
                  items={definitions}
                  translate={t}
                  onNodeToggle={handleDefinitionsNodeExpanded}
                  selectedPointer={selectedDefinitionNodeId}
                  isPropertiesView={false}
                />
              </TabPanel>
            </TabContext>
          </div>
        ) : (
          loadingIndicator
        )}
        {schema && editMode && (
          <aside className={classes.inspector}>
            <SchemaInspector language={language} selectedItem={selectedItem} />
          </aside>
        )}
      </main>
    </div>
  );
};

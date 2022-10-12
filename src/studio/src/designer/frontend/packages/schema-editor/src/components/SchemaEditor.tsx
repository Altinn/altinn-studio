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
  getNodeByPointer,
  getRootNodes,
  Keywords,
  makePointer,
  ObjectKind,
  pointerExists,
  UiSchemaNode,
} from '@altinn/schema-model';
import { IconImage } from './common/Icon';
import { ActionMenu } from './common/ActionMenu';

export interface IEditorProps {
  Toolbar: JSX.Element;
  LandingPagePanel: JSX.Element;
  language: ILanguage;
  loading?: boolean;
  name?: string;
  onSaveSchema: (payload: any) => void;
  schema: IJsonSchema;
  editMode: boolean;
  toggleEditMode: () => void;
}

export const SchemaEditor = ({
  Toolbar,
  LandingPagePanel,
  loading,
  schema,
  onSaveSchema,
  name,
  language,
  editMode,
  toggleEditMode,
}: IEditorProps) => {
  const dispatch = useDispatch();

  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  const selectedPropertyNode = useSelector((state: ISchemaState) => state.selectedPropertyNodeId);
  const selectedDefinitionNode = useSelector((state: ISchemaState) => state.selectedDefinitionNodeId);

  const { definitions, modelView } = useSelector((state: ISchemaState) => ({
    definitions: getRootNodes(state.uiSchema, true),
    modelView: getRootNodes(state.uiSchema, false),
  }));

  const selectedTab: string = useSelector((state: ISchemaState) => state.selectedEditorTab);
  const [expandedPropNodes, setExpandedPropNodes] = useState<string[]>([]);
  const [expandedDefNodes, setExpandedDefNodes] = useState<string[]>([]);

  const saveSchema = () => dispatch(updateJsonSchema({ onSaveSchema }));

  useEffect(() => {
    if (name) {
      dispatch(setSchemaName({ name }));
    }
  }, [dispatch, name]);

  useEffect(() => {
    if (jsonSchema && name) {
      dispatch(setUiSchema({ name }));
    }
  }, [dispatch, jsonSchema, name]);

  useEffect(() => {
    dispatch(setJsonSchema({ schema }));
  }, [dispatch, schema]);

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

  const handlePropertiesNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) => setExpandedPropNodes(nodeIds);

  const handleDefinitionsNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) => setExpandedDefNodes(nodeIds);

  const handleTabChanged = (_x: ChangeEvent<unknown>, value: 'definitions' | 'properties') =>
    dispatch(setSelectedTab({ selectedTab: value }));

  const loadingIndicator = loading ? (
    <AltinnSpinner spinnerText={getLanguageFromKey('general.loading', language)} />
  ) : null;

  const selectedId = useSelector((state: ISchemaState) =>
    state.selectedEditorTab === 'properties' ? state.selectedPropertyNodeId : state.selectedDefinitionNodeId,
  );

  const selectedItem = useSelector((state: ISchemaState) =>
    selectedId ? getNodeByPointer(state.uiSchema, selectedId) : undefined,
  );
  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);

  const checkIsNameInUse = (name: string) => pointerExists(uiSchema, name);
  const t = (key: string) => getTranslation(key, language);
  return (
    <div className={classes.root}>
      <TopToolbar
        Toolbar={Toolbar}
        language={language}
        saveAction={name ? saveSchema : undefined}
        toggleEditMode={name ? toggleEditMode : undefined}
        editMode={editMode}
      />
      <main className={classes.main}>
        {LandingPagePanel}
        {name && schema ? (
          <div data-testid='schema-editor' id='schema-editor' className={classes.editor}>
            <TabContext value={selectedTab}>
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
                  items={modelView}
                  translate={t}
                  onNodeToggle={handlePropertiesNodeExpanded}
                  selectedPointer={selectedPropertyNode}
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
                  selectedPointer={selectedDefinitionNode}
                />
              </TabPanel>
            </TabContext>
          </div>
        ) : (
          loadingIndicator
        )}
        {schema && editMode && (
          <aside className={classes.inspector}>
            <SchemaInspector language={language} selectedItem={selectedItem} checkIsNameInUse={checkIsNameInUse} />
          </aside>
        )}
      </main>
    </div>
  );
};

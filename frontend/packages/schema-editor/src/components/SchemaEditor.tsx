import type { ChangeEvent, MouseEvent } from 'react';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
import { TopToolbar } from './TopToolbar';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { SchemaTreeView } from './TreeView/SchemaTreeView';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
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
} from '@altinn/schema-model';
import { IconImage } from './common/Icon';
import { ActionMenu } from './common/ActionMenu';
import { createSelector } from '@reduxjs/toolkit';
import { Button, ButtonVariant, Tabs } from '@altinn/altinn-design-system';
import { Add } from '@navikt/ds-icons';

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

  const selectedPropertyNodeId = useSelector((state: ISchemaState) => state.selectedPropertyNodeId);
  const selectedPropertyParent = useSelector((state: ISchemaState) =>
    getParentNodeByPointer(state.uiSchema, state.selectedPropertyNodeId)
  );
  useEffect(() => {
    if (selectedPropertyParent && !expandedPropNodes.includes(selectedPropertyParent.pointer)) {
      setExpandedPropNodes((prevState) => [...prevState, selectedPropertyParent.pointer]);
    }
  }, [selectedPropertyParent, expandedPropNodes]);

  const selectedDefinitionNodeId = useSelector(
    (state: ISchemaState) => state.selectedDefinitionNodeId
  );
  const selectedDefinitionParent = useSelector((state: ISchemaState) =>
    getParentNodeByPointer(state.uiSchema, state.selectedDefinitionNodeId)
  );
  useEffect(() => {
    if (selectedDefinitionParent && !expandedDefNodes.includes(selectedDefinitionParent.pointer)) {
      setExpandedDefNodes((prevState) => [...prevState, selectedDefinitionParent.pointer]);
    }
  }, [selectedPropertyParent, expandedDefNodes, selectedDefinitionParent]);

  const handlePropertiesNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) =>
    setExpandedPropNodes(nodeIds);

  const handleDefinitionsNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) =>
    setExpandedDefNodes(nodeIds);

  const handleSaveSchema = () => dispatch(updateJsonSchema({ onSaveSchema }));

  const handleTabChanged = (value: 'definitions' | 'properties') =>
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
      })
    );
  };

  const handleAddDefinition = (e: MouseEvent) => {
    e.stopPropagation();
    dispatch(
      addRootItem({
        name: 'name',
        location: makePointer(Keywords.Definitions),
        props: { fieldType: FieldType.Object },
      })
    );
  };

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

  const modelsPanel = (
    <>
      {editMode && (
        <ActionMenu
          className={classes.addMenu}
          items={[
            {
              action: () => handleAddProperty(ObjectKind.Field),
              icon: IconImage.Object,
              text: t('field'),
              testId: SchemaEditorTestIds.menuAddField,
            },
            {
              action: () => handleAddProperty(ObjectKind.Reference),
              icon: IconImage.Reference,
              text: t('reference'),
              testId: SchemaEditorTestIds.menuAddReference,
            },
            {
              action: () => handleAddProperty(ObjectKind.Combination),
              icon: IconImage.Combination,
              text: t('combination'),
              testId: SchemaEditorTestIds.menuAddCombination,
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.String),
              className: classes.dividerAbove,
              icon: IconImage.String,
              text: t('string'),
              testId: SchemaEditorTestIds.menuAddString,
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.Integer),
              icon: IconImage.Number,
              text: t('integer'),
              testId: SchemaEditorTestIds.menuAddInteger,
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.Number),
              icon: IconImage.Number,
              text: t('number'),
              testId: SchemaEditorTestIds.menuAddNumber,
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.Boolean),
              icon: IconImage.Boolean,
              text: t('boolean'),
              testId: SchemaEditorTestIds.menuAddBoolean,
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
    </>
  );

  const typesPanel = (
    <>
      {editMode && (
        <Button icon={<Add />} onClick={handleAddDefinition} variant={ButtonVariant.Outline}>
          {t('add_element')}
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
    </>
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
                  content: modelsPanel,
                  value: 'properties',
                },
                {
                  name: t('types'),
                  content: typesPanel,
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
            <SchemaInspector language={language} selectedItem={selectedItem} />
          </aside>
        )}
      </main>
    </div>
  );
};

import React, { ReactNode, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { XMarkIcon } from '@navikt/aksel-icons';
import classes from './SchemaEditor.module.css';
import {
  setSchemaName,
  setSelectedId,
  setUiSchema,
} from '../features/editor/schemaEditorSlice';
import { SchemaInspector } from './SchemaInspector';
import { TopToolbar } from './TopToolbar';
import {
  buildJsonSchema,
  getNameFromPointer,
  isEmpty,
  pointerIsDefinition,
  UiSchemaNode,
  UiSchemaNodes
} from '@altinn/schema-model';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { ModelsPanel, TypesPanel } from './layout';
import { useTranslation } from 'react-i18next';
import { TypesInspector } from './TypesInspector';
import classNames from 'classnames';
import {
  selectedPropertyNodeIdSelector,
  selectedDefinitionNodeIdSelector,
  selectedIdSelector,
  getRootChildren,
  getRootNodes
} from '@altinn/schema-editor/selectors/schemaStateSelectors';
import { useSchemaSelector, useParentSchemaSelector } from '@altinn/schema-editor/hooks/useSchemaSelector';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { Toolbar, ToolbarProps } from 'app-shared/features/dataModelling/components/Toolbar';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { GenerateSchemaState } from 'app-shared/types/global';

export interface IEditorProps {
  LandingPagePanel: ReactNode;
  editMode: boolean;
  name?: string;
  onSaveSchema: (payload: JsonSchema) => void;
  schemaState: GenerateSchemaState;
  toggleEditMode: () => void;
  toolbarProps: Omit<ToolbarProps, 'disabled'>;
}

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
  LandingPagePanel,
  name,
  editMode,
  onSaveSchema,
  schemaState,
  toggleEditMode,
  toolbarProps,
}: IEditorProps) => {
  const dispatch = useDispatch();
  const { data } = useDatamodelQuery();

  useEffect(() => {
    if (name) {
      dispatch(setUiSchema({ name }));
      dispatch(setSchemaName({ name }));
    }
  }, [dispatch, name]);

  const [expandedPropNodes, setExpandedPropNodes] = useState<string[]>([]);
  const [expandedDefNodes, setExpandedDefNodes] = useState<string[]>([]);

  const [selectedType, setSelectedType] = useState<UiSchemaNode>(null);

  const translation = useTranslation();
  const t = (key: string, options: KeyValuePairs) => translation.t('schema_editor.' + key, options);

  const rootNodeMap = getRootNodes(data);
  const rootChildren = getRootChildren(data);
  const properties: UiSchemaNodes = [];
  const definitions: UiSchemaNodes = [];
  rootChildren?.forEach(
    (childPointer) => pointerIsDefinition(childPointer)
      ? definitions.push(rootNodeMap.get(childPointer))
      : properties.push(rootNodeMap.get(childPointer))
  );

  const selectedPropertyParent = useParentSchemaSelector(selectedPropertyNodeIdSelector);
  const selectedItem = useSchemaSelector(selectedIdSelector);

  useEffect(() => {
    if (selectedType) {
      const isExistingNode = !!rootNodeMap.get(selectedType.pointer);
      if (!isExistingNode) setSelectedType(null);
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

  const selectedDefinitionParent = useParentSchemaSelector(selectedDefinitionNodeIdSelector);
  useEffect(() => {
    if (selectedDefinitionParent && !expandedDefNodes.includes(selectedDefinitionParent.pointer)) {
      setExpandedDefNodes((prevState) => [...prevState, selectedDefinitionParent.pointer]);
    }
  }, [selectedPropertyParent, expandedDefNodes, selectedDefinitionParent]);

  const handleSaveSchema = () => onSaveSchema(buildJsonSchema(data));

  const handleSelectType = (node: UiSchemaNode) => {
    setSelectedType(node);
    dispatch(setSelectedId({ pointer: node.pointer }));
  };

  const handleResetSelectedType = () => {
    setSelectedType(null);
    dispatch(setSelectedId({ pointer: '' }));
  };

  return (
    <div className={classes.root}>
      <TopToolbar
        Toolbar={(<Toolbar {...toolbarProps} disabled={isEmpty(data)}/>)}
        editMode={editMode}
        saveAction={name ? handleSaveSchema : undefined}
        schemaState={schemaState}
        toggleEditMode={name ? toggleEditMode : undefined}
      />
      <main className={classes.main}>
        {isEmpty(data) ? LandingPagePanel : (
          <aside className={classes.inspector}>
            <TypesInspector
              schemaItems={definitions}
              handleSelectType={handleSelectType}
              key={selectedType?.pointer || ''}
              selectedNodePointer={selectedType?.pointer}
            />
          </aside>
        )}
        {name && !isEmpty(data) && selectedType && (
          <div
            data-testid='types-editor'
            id='types-editor'
            className={classNames(classes.editor, classes.editorTypes)}
          >
            <div className={classes.typeInfo}>
              <span>
                {t(
                  'types_editing',
                  { type: getNameFromPointer({ pointer: selectedType.pointer }) }
                )}
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
        {name && !isEmpty(data) && !selectedType && (
          <div data-testid='schema-editor' id='schema-editor' className={classes.editor}>
            <ModelsPanel
              editMode={editMode}
              setExpandedPropNodes={setExpandedPropNodes}
              expandedPropNodes={expandedPropNodes}
              properties={properties}
            />
          </div>
        )}
        {!isEmpty(data) && editMode && (
          <aside className={classes.inspector}>
            <SchemaInspector selectedItem={selectedItem} key={selectedItem?.pointer || ''} />
          </aside>
        )}
      </main>
    </div>
  );
};

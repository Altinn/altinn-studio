import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import classes from './SchemaEditor.module.css';
import {
  setSchemaName,
  setSelectedId,
  setUiSchema,
} from '../features/editor/schemaEditorSlice';
import { useTranslation } from 'react-i18next';
import {
  getRootChildren,
  getRootNodes,
  selectedDefinitionNodeIdSelector,
  selectedIdSelector,
  selectedPropertyNodeIdSelector,
} from '@altinn/schema-editor/selectors/schemaStateSelectors';
import { useParentSchemaSelector, useSchemaSelector } from '@altinn/schema-editor/hooks/useSchemaSelector';
import { TypesInspector } from '@altinn/schema-editor/components/TypesInspector';
import classNames from 'classnames';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { XMarkIcon } from '@navikt/aksel-icons';
import { ModelsPanel, TypesPanel } from '@altinn/schema-editor/components/layout';
import { SchemaInspector } from '@altinn/schema-editor/components/SchemaInspector';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import {
  UiSchemaNode,
  UiSchemaNodes,
  getNameFromPointer,
  isEmpty,
  pointerIsDefinition,
} from '@altinn/schema-model';

export enum SchemaEditorTestIds {
  menuAddReference = 'action-menu-add-reference',
  menuAddField = 'action-menu-add-field',
  menuAddCombination = 'action-menu-add-combination',
  menuAddString = 'action-menu-add-string',
  menuAddInteger = 'action-menu-add-integer',
  menuAddNumber = 'action-menu-add-number',
  menuAddBoolean = 'action-menu-add-boolean',
}

export interface SchemaEditorProps {
  modelName?: string;
}

export const SchemaEditor = ({ modelName }: SchemaEditorProps) => {
  const dispatch = useDispatch();
  const { data } = useDatamodelQuery();

  useEffect(() => {
    if (modelName) {
      dispatch(setUiSchema({ name: modelName }));
      dispatch(setSchemaName({ name: modelName }));
    }
  }, [dispatch, modelName]);

  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<UiSchemaNode>(null);

  const [expandedPropNodes, setExpandedPropNodes] = useState<string[]>([]);
  const [expandedDefNodes, setExpandedDefNodes] = useState<string[]>([]);

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
      setSelectedType(isExistingNode ? rootNodeMap.get(selectedType.pointer) : null);
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

  if (isEmpty(data)) return null;

  const handleSelectType = (node: UiSchemaNode) => {
    setSelectedType(node);
    dispatch(setSelectedId({ pointer: node.pointer }));
  };

  const handleResetSelectedType = () => {
    setSelectedType(null);
    dispatch(setSelectedId({ pointer: '' }));
  };

  return (
    <>
      <aside className={classes.inspector}>
        <TypesInspector
          schemaItems={definitions}
          handleSelectType={handleSelectType}
          key={selectedType?.pointer || ''}
          selectedNodePointer={selectedType?.pointer}
        />
      </aside>
      {selectedType ? (
        <div
          data-testid='types-editor'
          id='types-editor'
          className={classNames(classes.editor, classes.editorTypes)}
        >
          <div className={classes.typeInfo}>
            <span>
              {t(
                'schema_editor.types_editing',
                { type: getNameFromPointer({ pointer: selectedType.pointer }) }
              )}
            </span>
            <Button
              onClick={handleResetSelectedType}
              icon={<XMarkIcon />}
              variant={ButtonVariant.Quiet}
              color={ButtonColor.Inverted}
              aria-label={t('schema_editor.close_type')}
              size='small'
            />
          </div>
          <TypesPanel
            uiSchemaNode={selectedType}
            setExpandedDefNodes={setExpandedDefNodes}
            expandedDefNodes={
              expandedDefNodes.includes(selectedType?.pointer)
                ? expandedDefNodes
                : expandedDefNodes.concat([selectedType.pointer])
            }
          />
        </div>
      ) : (
        <div data-testid='schema-editor' id='schema-editor' className={classes.editor}>
          <ModelsPanel
            setExpandedPropNodes={setExpandedPropNodes}
            expandedPropNodes={expandedPropNodes}
            properties={properties}
          />
        </div>
      )}
      <aside className={classes.inspector}>
        <SchemaInspector selectedItem={selectedItem} key={selectedItem?.pointer || ''} />
      </aside>
    </>
  );
};

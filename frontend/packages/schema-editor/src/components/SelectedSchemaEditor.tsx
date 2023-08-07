import React, { useEffect, useState } from 'react';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { PageSpinner } from 'app-shared/components';
import { useTranslation } from 'react-i18next';
import { Center } from 'app-shared/components/Center';
import { Alert, Button, ButtonColor, ButtonVariant, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import classes from './SelectedSchemaEditor.module.css';
import { TypesInspector } from '@altinn/schema-editor/components/TypesInspector';
import classNames from 'classnames';
import { XMarkIcon } from '@navikt/aksel-icons';
import { ModelsPanel, TypesPanel } from '@altinn/schema-editor/components/layout';
import { SchemaInspector } from '@altinn/schema-editor/components/SchemaInspector';
import {
  UiSchemaNode,
  UiSchemaNodes,
  getNameFromPointer,
  isEmpty,
  pointerIsDefinition,
} from '@altinn/schema-model';
import { setSelectedId } from '@altinn/schema-editor/features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';
import {
  getRootChildren,
  getRootNodes,
  selectedDefinitionNodeIdSelector,
  selectedIdSelector,
  selectedPropertyNodeIdSelector
} from '@altinn/schema-editor/selectors/schemaStateSelectors';
import { useParentSchemaSelector, useSchemaSelector } from '@altinn/schema-editor/hooks/useSchemaSelector';

export function SelectedSchemaEditor() {
  const { status, error, data } = useDatamodelQuery();
  const { t } = useTranslation();

  switch (status) {
    case 'loading':
      return <PageSpinner />;

    case 'error':
      return (
        <Center>
          <Alert severity='danger'>
            <Paragraph>{t('general.fetch_error_message')}</Paragraph>
            <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
            <ErrorMessage>{error.message}</ErrorMessage>
          </Alert>
        </Center>
      );

    case 'success':
      return <SelectedSchemaEditorContent datamodel={data}/>;
  }
}

type SelectedSchemaEditorContentProps = {
  datamodel: UiSchemaNodes;
}

const SelectedSchemaEditorContent = ({ datamodel }: SelectedSchemaEditorContentProps) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<UiSchemaNode>(null);

  const [expandedPropNodes, setExpandedPropNodes] = useState<string[]>([]);
  const [expandedDefNodes, setExpandedDefNodes] = useState<string[]>([]);

  const rootNodeMap = getRootNodes(datamodel);
  const rootChildren = getRootChildren(datamodel);
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

  if (isEmpty(datamodel)) return null;

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
}

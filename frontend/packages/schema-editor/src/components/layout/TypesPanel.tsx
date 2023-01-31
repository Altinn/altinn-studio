import { Add } from '@navikt/ds-icons';
import type { ChangeEvent, MouseEvent } from 'react';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ISchemaState } from '@altinn/schema-editor/types';
import { addRootItem } from '@altinn/schema-editor/features/editor/schemaEditorSlice';
import { Button, ButtonVariant } from '@digdir/design-system-react';

import type { UiSchemaNodes } from '@altinn/schema-model';
import { FieldType, Keywords, makePointer } from '@altinn/schema-model';

import { SchemaTreeView } from '../TreeView/SchemaTreeView';
import type { PanelProps } from '@altinn/schema-editor/components/layout/layoutTypes';
import { getTranslation } from '@altinn/schema-editor/utils/language';

export type TypesPanelProps = PanelProps & {
  expandedDefNodes: string[];
  setExpandedDefNodes: (nodes: string[]) => void;
  definitions: UiSchemaNodes;
};
export const TypesPanel = ({
  language,
  editMode,
  expandedDefNodes,
  setExpandedDefNodes,
  definitions,
}: TypesPanelProps) => {
  const t = (key: string) => getTranslation(key, language);
  const dispatch = useDispatch();
  const selectedDefinitionNodeId = useSelector(
    (state: ISchemaState) => state.selectedDefinitionNodeId
  );
  const handleDefinitionsNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) =>
    setExpandedDefNodes(nodeIds);

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
  return (
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
};

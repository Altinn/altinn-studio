import React from 'react';
import { StudioDragAndDropTree } from 'libs/studio-components-legacy/src';
import { renderSchemaNodeList } from './renderSchemaNodeList';
import { useTranslation } from 'react-i18next';
import { useSavableSchemaModel } from '../../hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { SchemaModel } from '@altinn/schema-model/lib/SchemaModel';

export interface SchemaTreeProps {
  schemaPointer?: string;
}

export const SchemaTree = ({ schemaPointer }: SchemaTreeProps) => {
  const savableModel = useSavableSchemaModel();
  const uniquePointer = SchemaModel.getUniquePointer(schemaPointer);
  const { selectedUniquePointer, setSelectedUniquePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();

  return (
    <StudioDragAndDropTree.Root
      emptyMessage={t('schema_editor.empty_node')}
      onSelect={setSelectedUniquePointer}
      selectedId={selectedUniquePointer}
    >
      {renderSchemaNodeList(savableModel, schemaPointer, uniquePointer)}
    </StudioDragAndDropTree.Root>
  );
};

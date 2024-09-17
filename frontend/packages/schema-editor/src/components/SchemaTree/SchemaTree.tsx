import React from 'react';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaNodeList } from './renderSchemaNodeList';
import { useTranslation } from 'react-i18next';
import { useSavableSchemaModel } from '../../hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';

export interface SchemaTreeProps {
  schemaPointer?: string;
}

export const SchemaTree = ({ schemaPointer }: SchemaTreeProps) => {
  const savableModel = useSavableSchemaModel();
  const uniquePointer = savableModel.getUniquePointer(schemaPointer);
  const { selectedUniquePointer, setSelectedUniquePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();

  return (
    <DragAndDropTree.Root
      emptyMessage={t('schema_editor.empty_node')}
      onSelect={setSelectedUniquePointer}
      selectedId={selectedUniquePointer}
    >
      {renderSchemaNodeList(savableModel, schemaPointer, uniquePointer)}
    </DragAndDropTree.Root>
  );
};

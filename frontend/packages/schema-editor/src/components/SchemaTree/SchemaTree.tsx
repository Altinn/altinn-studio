import React from 'react';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaNodeList } from './renderSchemaNodeList';
import { useTranslation } from 'react-i18next';
import { useSavableSchemaModel } from '../../hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';

export interface SchemaTreeProps {
  pointer?: string;
}

export const SchemaTree = ({ pointer }: SchemaTreeProps) => {
  const savableModel = useSavableSchemaModel();
  const { selectedUniqueNodePointer, setSelectedUniqueNodePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();
  return (
    <DragAndDropTree.Root
      emptyMessage={t('schema_editor.empty_node')}
      onSelect={setSelectedUniqueNodePointer}
      selectedUniqueId={selectedUniqueNodePointer}
    >
      {renderSchemaNodeList(savableModel, pointer, selectedUniqueNodePointer)}
    </DragAndDropTree.Root>
  );
};

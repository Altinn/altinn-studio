import React from 'react';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaNodeList } from './renderSchemaNodeList';
import { useTranslation } from 'react-i18next';
import { SchemaNode } from './SchemaNode';
import { useSavableSchemaModel } from '../../hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export interface SchemaTreeProps {
  pointer?: string;
}

export const SchemaTree = ({ pointer }: SchemaTreeProps) => {
  const savableModel = useSavableSchemaModel();
  const { setSelectedNodePointer, selectedNodePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();
  return (
    <DragAndDropTree.Root
      emptyMessage={t('schema_editor.empty_node')}
      onSelect={setSelectedNodePointer}
      selectedId={selectedNodePointer}
    >
      {pointer ? <SchemaNode pointer={pointer} /> : renderSchemaNodeList(savableModel, pointer)}
    </DragAndDropTree.Root>
  );
};

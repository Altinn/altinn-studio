import React from 'react';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaNodeList } from './renderSchemaNodeList';
import { setSelectedId } from '@altinn/schema-editor/features/editor/schemaEditorSlice';
import { useDispatch, useSelector } from 'react-redux';
import { SavableSchemaModel } from '@altinn/schema-editor/classes/SavableSchemaModel';
import { selectedIdSelector } from '@altinn/schema-editor/selectors/reduxSelectors';
import { useTranslation } from 'react-i18next';
import { SchemaNode } from '@altinn/schema-editor/components/SchemaTree/SchemaNode';

export interface SchemaTreeProps {
  savableSchemaModel: SavableSchemaModel;
  pointer?: string;
}

export const SchemaTree = ({ savableSchemaModel, pointer }: SchemaTreeProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const handleSelect = (pointerToSelect: string) =>
    dispatch(setSelectedId({ pointer: pointerToSelect }));
  const selectedPointer = useSelector(selectedIdSelector);
  return (
    <DragAndDropTree.Root
      emptyMessage={t('schema_editor.empty_node')}
      onSelect={handleSelect}
      selectedId={selectedPointer}
    >
      {pointer ? (
        <SchemaNode pointer={pointer} savableModel={savableSchemaModel} />
      ) : (
        renderSchemaNodeList(savableSchemaModel, pointer)
      )}
    </DragAndDropTree.Root>
  );
};

import React from 'react';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaNodeList } from './renderSchemaNodeList';
import { setSelectedId } from '../../features/editor/schemaEditorSlice';
import { useDispatch, useSelector } from 'react-redux';
import { selectedIdSelector } from '../../selectors/reduxSelectors';
import { useTranslation } from 'react-i18next';
import { SchemaNode } from './SchemaNode';
import { useSavableSchemaModel } from '../../hooks/useSavableSchemaModel';

export interface SchemaTreeProps {
  pointer?: string;
}

export const SchemaTree = ({ pointer }: SchemaTreeProps) => {
  const savableModel = useSavableSchemaModel();
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
      {pointer ? <SchemaNode pointer={pointer} /> : renderSchemaNodeList(savableModel, pointer)}
    </DragAndDropTree.Root>
  );
};

import React from 'react';
import { SchemaModel } from '@altinn/schema-model';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaNodeList } from './renderSchemaNodeList';
import {setSelectedId} from '@altinn/schema-editor/features/editor/schemaEditorSlice';
import {useDispatch} from 'react-redux';

export interface SchemaTreeProps {
  schema: SchemaModel;
  pointer?: string;
}

export const SchemaTree = ({ schema, pointer }: SchemaTreeProps) => {
  const dispatch = useDispatch();
  const handleSelect = (pointer: string) => dispatch(setSelectedId({ pointer }));
  return (
    <DragAndDropTree.Root emptyMessage={'asdasdasd'} onSelect={handleSelect}>
      {renderSchemaNodeList(schema, pointer)}
    </DragAndDropTree.Root>
  );
};

import {HandleMove, ItemPosition} from 'app-shared/types/dndTypes';
import {useSchemaEditorAppContext} from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import {useCallback} from 'react';
import {NodePosition} from '../../../../../schema-model';
import {calculatePositionInFullList} from '@altinn/schema-editor/components/SchemaEditor/utils';

export const useMoveProperty = (): HandleMove => {
  const { schemaModel, save } = useSchemaEditorAppContext();
  return  useCallback((pointer: string, position: ItemPosition) => {
    const index = calculatePositionInFullList(schemaModel, position);
    const target: NodePosition = {parentPointer: position.parentId, index};
    schemaModel.moveNode(pointer, target);
    save(schemaModel);
  }, [schemaModel, save]);
};

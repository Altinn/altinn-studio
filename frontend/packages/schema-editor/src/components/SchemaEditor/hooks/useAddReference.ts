import { HandleAdd, ItemPosition } from 'app-shared/types/dndTypes';
import { useCallback } from 'react';
import { NodePosition } from '../../../../../schema-model';
import { calculatePositionInFullList } from '@altinn/schema-editor/components/SchemaEditor/utils';
import { useSavableSchemaModel } from '@altinn/schema-editor/hooks/useSavableSchemaModel';

export const useAddReference = (): HandleAdd<string> => {
  const savableModel = useSavableSchemaModel();
  return useCallback((reference: string, position: ItemPosition) => {
    const index = calculatePositionInFullList(savableModel, position);
    const target: NodePosition = { parentPointer: position.parentId, index };
    const refName = savableModel.generateUniqueChildName(target.parentPointer, 'ref');
    savableModel.addReference(refName, reference, target);
  }, [savableModel]);
};

import type { HandleAdd, ItemPosition } from 'app-shared/types/dndTypes';
import { useCallback } from 'react';
import type { NodePosition } from '@altinn/schema-model';
import { calculatePositionInFullList } from '../utils';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';

export const useAddReference = (): HandleAdd<string> => {
  const savableModel = useSavableSchemaModel();
  return useCallback(
    (reference: string, position: ItemPosition) => {
      const index = calculatePositionInFullList(savableModel, position);
      const target: NodePosition = { parentPointer: position.parentId, index };
      const refName = savableModel.generateUniqueChildName(target.parentPointer, 'ref');
      savableModel.addReference(refName, reference, target);
    },
    [savableModel],
  );
};

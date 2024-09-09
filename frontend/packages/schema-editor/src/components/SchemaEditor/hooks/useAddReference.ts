import type { HandleAdd, ItemPosition } from 'app-shared/types/dndTypes';
import { useCallback } from 'react';
import type { NodePosition } from '@altinn/schema-model';
import { calculatePositionInFullList } from '../utils';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export const useAddReference = (): HandleAdd<string> => {
  const { setSelectedUniquePointer } = useSchemaEditorAppContext();
  const savableModel = useSavableSchemaModel();
  return useCallback(
    (reference: string, position: ItemPosition) => {
      const index = calculatePositionInFullList(savableModel, position);
      const target: NodePosition = { parentPointer: position.parentId, index };
      const schemaPointer = savableModel.getFinalNode(target.parentPointer).schemaPointer;
      const refName = savableModel.generateUniqueChildName(schemaPointer, 'ref');
      const ref = savableModel.addReference(refName, reference, target);
      setSelectedUniquePointer(ref.schemaPointer);
    },
    [savableModel, setSelectedUniquePointer],
  );
};

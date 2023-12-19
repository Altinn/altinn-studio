import { HandleMove, ItemPosition } from 'app-shared/types/dndTypes';
import { useCallback } from 'react';
import { extractNameFromPointer, isCombination, NodePosition } from '../../../../../schema-model';
import { calculatePositionInFullList } from '@altinn/schema-editor/components/SchemaEditor/utils';
import { useSavableSchemaModel } from '@altinn/schema-editor/hooks/useSavableSchemaModel';
import { useTranslation } from 'react-i18next';

export const useMoveProperty = (): HandleMove => {
  const savableModel = useSavableSchemaModel();
  const { t } = useTranslation();

  const areThereCollidingNames = useCallback(
    (pointer: string, position: ItemPosition): boolean => {
      const currentParent = savableModel.getParentNode(pointer);
      const isMovingWithinSameParent = position.parentId === currentParent.pointer;
      if (isMovingWithinSameParent) return false;
      const targetParent = savableModel.getNode(position.parentId);
      const isTargetParentACombination = isCombination(targetParent);
      if (isTargetParentACombination) return false;
      const name = extractNameFromPointer(pointer);
      return savableModel.doesNodeHaveChildWithName(position.parentId, name);
    },
    [savableModel],
  );

  return useCallback(
    (pointer: string, position: ItemPosition) => {
      const index = calculatePositionInFullList(savableModel, position);
      const target: NodePosition = { parentPointer: position.parentId, index };
      const name = extractNameFromPointer(pointer);
      if (areThereCollidingNames(pointer, position)) {
        const parent = extractNameFromPointer(position.parentId);
        alert(t('schema_editor.move_node_same_name_error', { name, parent }));
      } else {
        savableModel.moveNode(pointer, target);
      }
    },
    [savableModel, t, areThereCollidingNames],
  );
};

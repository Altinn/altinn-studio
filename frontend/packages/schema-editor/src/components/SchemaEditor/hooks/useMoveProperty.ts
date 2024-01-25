import type { HandleMove, ItemPosition } from 'app-shared/types/dndTypes';
import { useCallback } from 'react';
import type { NodePosition } from '@altinn/schema-model';
import { extractNameFromPointer, isCombination } from '@altinn/schema-model';
import { calculatePositionInFullList } from '../utils';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export const useMoveProperty = (): HandleMove => {
  const savableModel = useSavableSchemaModel();
  const { selectedNodePointer, setSelectedNodePointer } = useSchemaEditorAppContext();
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
        const movedNode = savableModel.moveNode(pointer, target);
        if (selectedNodePointer === pointer) {
          setSelectedNodePointer(movedNode.pointer);
        }
      }
    },
    [savableModel, t, areThereCollidingNames, selectedNodePointer, setSelectedNodePointer],
  );
};

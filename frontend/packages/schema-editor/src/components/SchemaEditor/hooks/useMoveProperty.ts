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
  const { selectedUniquePointer, setSelectedUniquePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();
  const areThereCollidingNames = useCallback(
    (schemaPointer: string, schemaParentPointer: string): boolean => {
      const currentParent = savableModel.getParentNode(schemaPointer);
      const isMovingWithinSameParent = schemaParentPointer === currentParent.schemaPointer;
      if (isMovingWithinSameParent) return false;
      const targetParent = savableModel.getNodeBySchemaPointer(schemaParentPointer);
      const isTargetParentACombination = isCombination(targetParent);
      if (isTargetParentACombination) return false;
      const name = extractNameFromPointer(schemaPointer);
      return savableModel.doesNodeHaveChildWithName(schemaParentPointer, name);
    },
    [savableModel],
  );

  return useCallback(
    (uniquePointer: string, position: ItemPosition) => {
      const schemaPointer = savableModel.getSchemaPointerByUniquePointer(uniquePointer);
      const schemaParentPointer = savableModel.getSchemaPointerByUniquePointer(position.parentId);
      const index = calculatePositionInFullList(savableModel, position);
      const target: NodePosition = { parentPointer: schemaParentPointer, index };
      const name = extractNameFromPointer(schemaPointer);
      if (areThereCollidingNames(schemaPointer, schemaParentPointer)) {
        const parent = extractNameFromPointer(schemaParentPointer);
        alert(t('schema_editor.move_node_same_name_error', { name, parent }));
      } else {
        if (selectedUniquePointer === uniquePointer) {
          const movedNode = savableModel.moveNode(schemaPointer, target);
          const movedUniquePointer = savableModel.getUniquePointer(movedNode.schemaPointer);
          setSelectedUniquePointer(movedUniquePointer);
        }
      }
    },
    [savableModel, t, areThereCollidingNames, selectedUniquePointer, setSelectedUniquePointer],
  );
};

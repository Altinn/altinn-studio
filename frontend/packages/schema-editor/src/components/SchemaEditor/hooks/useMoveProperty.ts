import type { HandleMove, ItemPosition } from 'app-shared/types/dndTypes';
import { useCallback } from 'react';
import type { NodePosition } from '@altinn/schema-model';
import { SchemaModel, extractNameFromPointer, isCombination } from '@altinn/schema-model';
import { calculatePositionInFullList } from '../utils';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

type MovementErrorCode = 'circular' | 'colliding_names';

export const useMoveProperty = (): HandleMove => {
  const savableModel = useSavableSchemaModel();
  const { selectedUniquePointer, setSelectedUniquePointer } = useSchemaEditorAppContext();
  const movementError = useMovementError();
  const movementErrorAlert = useMovementErrorAlert();

  return useCallback(
    (uniquePointer: string, position: ItemPosition) => {
      const schemaPointer = savableModel.getSchemaPointerByUniquePointer(uniquePointer);
      const schemaParentPointer = savableModel.getSchemaPointerByUniquePointer(position.parentId);
      const index = calculatePositionInFullList(savableModel, position);
      const target: NodePosition = { parentPointer: schemaParentPointer, index };
      const name = extractNameFromPointer(schemaPointer);
      const error = movementError(schemaPointer, schemaParentPointer);
      if (error) {
        const parent = extractNameFromPointer(schemaParentPointer);
        movementErrorAlert(error, { name, parent });
        return;
      }
      const movedNode = savableModel.moveNode(schemaPointer, target);
      if (selectedUniquePointer === uniquePointer) {
        const movedUniquePointer = SchemaModel.getUniquePointer(
          movedNode.schemaPointer,
          position.parentId,
        );
        setSelectedUniquePointer(movedUniquePointer);
      }
    },
    [
      savableModel,
      movementError,
      selectedUniquePointer,
      setSelectedUniquePointer,
      movementErrorAlert,
    ],
  );
};

function useMovementError(): (
  schemaPointer: string,
  targetSchemaPointer: string,
) => MovementErrorCode | null {
  const savableModel = useSavableSchemaModel();
  const areThereCollidingNames = useCollidingNamesError();
  return useCallback(
    (schemaPointer: string, targetSchemaPointer: string): MovementErrorCode | null => {
      if (savableModel.willResultInCircularReferences(schemaPointer, targetSchemaPointer)) {
        return 'circular';
      } else if (areThereCollidingNames(schemaPointer, targetSchemaPointer)) {
        return 'colliding_names';
      }
      return null;
    },
    [savableModel, areThereCollidingNames],
  );
}

function useCollidingNamesError(): (schemaPointer: string, targetSchemaPointer: string) => boolean {
  const savableModel = useSavableSchemaModel();
  return useCallback(
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
}

type AlertMessageInfo = {
  name: string;
  parent: string;
};

function useMovementErrorAlert(): (errorCode: MovementErrorCode, info: AlertMessageInfo) => void {
  const movementErrorMessage = useMovementErrorMessage();
  return useCallback(
    (errorCode: MovementErrorCode, info: AlertMessageInfo) => {
      const message = movementErrorMessage(errorCode, info);
      alert(message);
    },
    [movementErrorMessage],
  );
}

function useMovementErrorMessage(): (
  errorCode: MovementErrorCode,
  info: AlertMessageInfo,
) => string {
  const { t } = useTranslation();
  return useCallback(
    (errorCode: MovementErrorCode, info: AlertMessageInfo) => {
      switch (errorCode) {
        case 'circular':
          return t('schema_editor.error_circular_references');
        case 'colliding_names':
          return t('schema_editor.move_node_same_name_error', info);
      }
    },
    [t],
  );
}

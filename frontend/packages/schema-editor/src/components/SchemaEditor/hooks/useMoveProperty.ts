import { HandleMove, ItemPosition } from 'app-shared/types/dndTypes';
import { useCallback } from 'react';
import { extractNameFromPointer, NodePosition } from '../../../../../schema-model';
import { calculatePositionInFullList } from '@altinn/schema-editor/components/SchemaEditor/utils';
import { useSavableSchemaModel } from '@altinn/schema-editor/hooks/useSavableSchemaModel';
import { useTranslation } from 'react-i18next';

export const useMoveProperty = (): HandleMove => {
  const savableModel = useSavableSchemaModel();
  const { t } = useTranslation();
  return useCallback(
    (pointer: string, position: ItemPosition) => {
      const index = calculatePositionInFullList(savableModel, position);
      const target: NodePosition = { parentPointer: position.parentId, index };
      const name = extractNameFromPointer(pointer);
      if (savableModel.doesNodeHaveChildWithName(position.parentId, name)) {
        const parent = extractNameFromPointer(position.parentId);
        alert(t('schema_editor.move_node_same_name_error', { name, parent }));
      } else {
        savableModel.moveNode(pointer, target);
      }
    },
    [savableModel, t],
  );
};

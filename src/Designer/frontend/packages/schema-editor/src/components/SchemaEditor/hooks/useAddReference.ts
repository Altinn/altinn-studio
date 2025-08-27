import type { HandleAdd, ItemPosition } from 'app-shared/types/dndTypes';
import { useCallback } from 'react';
import type { NodePosition } from '@altinn/schema-model/index';
import { createDefinitionPointer, SchemaModel } from '@altinn/schema-model/index';

import { calculatePositionInFullList } from '../utils';
import { useSavableSchemaModel } from '../../../hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { useTranslation } from 'react-i18next';

export const useAddReference = (): HandleAdd<string> => {
  const { setSelectedUniquePointer } = useSchemaEditorAppContext();
  const savableModel = useSavableSchemaModel();
  const circularReferenceError = useCircularReferenceError();
  const circularReferenceAlert = useCircularReferenceAlert();
  return useCallback(
    (reference: string, position: ItemPosition) => {
      const index = calculatePositionInFullList(savableModel, position);
      const parentPointer = savableModel.getSchemaPointerByUniquePointer(position.parentId);
      if (circularReferenceError(reference, parentPointer)) {
        circularReferenceAlert();
        return;
      }
      const target: NodePosition = { parentPointer, index };
      const { schemaPointer } = savableModel.getFinalNode(target.parentPointer);
      const refName = savableModel.generateUniqueChildName(schemaPointer, 'ref');
      const ref = savableModel.addReference(refName, reference, target);
      const uniquePointer = SchemaModel.getUniquePointer(ref.schemaPointer);
      setSelectedUniquePointer(uniquePointer);
    },
    [savableModel, setSelectedUniquePointer, circularReferenceAlert, circularReferenceError],
  );
};

function useCircularReferenceError(): (reference: string, targetSchemaPointer: string) => boolean {
  const savableModel = useSavableSchemaModel();
  return useCallback(
    (reference: string, targetSchemaPointer: string) => {
      const referencePointer = createDefinitionPointer(reference);
      return savableModel.willResultInCircularReferences(referencePointer, targetSchemaPointer);
    },
    [savableModel],
  );
}

function useCircularReferenceAlert(): () => void {
  const { t } = useTranslation();
  return useCallback(() => alert(t('schema_editor.error_circular_references')), [t]);
}

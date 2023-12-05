import {HandleAdd, ItemPosition} from 'app-shared/types/dndTypes';
import {useSchemaEditorAppContext} from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import {useCallback} from 'react';
import {NodePosition} from '../../../../../schema-model';
import {calculatePositionInFullList} from '@altinn/schema-editor/components/SchemaEditor/utils';

export const useAddReference = (): HandleAdd<string> => {
  const { schemaModel, save } = useSchemaEditorAppContext();
  return useCallback((reference: string, position: ItemPosition) => {
    const index = calculatePositionInFullList(schemaModel, position);
    const target: NodePosition = {parentPointer: position.parentId, index};
    const refName = schemaModel.generateUniqueChildName(target.parentPointer, 'ref');
    schemaModel.addReference(refName, reference, target);
    save(schemaModel);
  }, [schemaModel, save]);
};

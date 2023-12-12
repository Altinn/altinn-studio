import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { SavableSchemaModel } from '@altinn/schema-editor/classes/SavableSchemaModel';

export const useSavableSchemaModel = () => {
  const { schemaModel, save } = useSchemaEditorAppContext();
  return new SavableSchemaModel(schemaModel, save);
};

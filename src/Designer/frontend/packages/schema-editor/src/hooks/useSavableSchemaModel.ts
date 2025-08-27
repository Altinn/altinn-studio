import { useSchemaEditorAppContext } from './useSchemaEditorAppContext';
import { SavableSchemaModel } from '../classes/SavableSchemaModel';

export const useSavableSchemaModel = () => {
  const { schemaModel, save } = useSchemaEditorAppContext();
  return new SavableSchemaModel(schemaModel, save);
};

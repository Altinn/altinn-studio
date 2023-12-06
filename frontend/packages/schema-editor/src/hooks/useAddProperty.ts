import { useSchemaEditorAppContext } from './useSchemaEditorAppContext';
import { FieldType, NodePosition, ObjectKind, ROOT_POINTER } from '../../../schema-model';
import { useTranslation } from 'react-i18next';

export const useAddProperty = () => {
  const { schemaModel, save } = useSchemaEditorAppContext();
  const { t } = useTranslation();

  const addProperty = (
    objectKind: ObjectKind,
    fieldType?: FieldType,
    parentPointer: string = ROOT_POINTER,
  ): string | undefined => {
    const target: NodePosition = { parentPointer, index: -1 };
    const name = schemaModel.generateUniqueChildName(parentPointer, 'name');
    switch (objectKind) {
      case ObjectKind.Reference:
        return addReference(name);
      case ObjectKind.Field:
        return addField(name, target, fieldType);
      case ObjectKind.Combination:
        return addCombination(name, target);
    }
  };

  const addReference = (name: string): string | undefined => {
    const reference = prompt(t('schema_editor.add_reference.prompt'));
    if (!reference) return undefined;
    if (schemaModel.hasDefinition(reference)) {
      const { pointer } = schemaModel.addReference(name, reference);
      save(schemaModel);
      return pointer;
    } else {
      alert(t('schema_editor.add_reference.type_does_not_exist', { reference }));
      return undefined;
    }
  };

  const addField = (name: string, target: NodePosition, fieldType?: FieldType): string => {
    const { pointer } = schemaModel.addField(name, fieldType, target);
    save(schemaModel);
    return pointer;
  };

  const addCombination = (name: string, target: NodePosition): string => {
    const { pointer } = schemaModel.addCombination(name, target);
    save(schemaModel);
    return pointer;
  };

  return addProperty;
};

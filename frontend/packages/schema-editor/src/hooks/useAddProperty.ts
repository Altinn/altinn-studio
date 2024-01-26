import type { FieldType, NodePosition } from '@altinn/schema-model';
import { ObjectKind, ROOT_POINTER } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { useSavableSchemaModel } from '../hooks/useSavableSchemaModel';

type AddProperty = (
  objectKind: ObjectKind,
  fieldType?: FieldType,
  parentPointer?: string,
) => string | undefined;

export const useAddProperty = (): AddProperty => {
  const savableModel = useSavableSchemaModel();
  const { t } = useTranslation();

  const addProperty: AddProperty = (
    objectKind: ObjectKind,
    fieldType?: FieldType,
    parentPointer: string = ROOT_POINTER,
  ): string | undefined => {
    const target: NodePosition = { parentPointer, index: -1 };
    const name = savableModel.generateUniqueChildName(parentPointer, 'name');
    switch (objectKind) {
      case ObjectKind.Reference:
        return addReference(name, target);
      case ObjectKind.Field:
        return addField(name, target, fieldType);
      case ObjectKind.Combination:
        return addCombination(name, target);
    }
  };

  const addReference = (name: string, target: NodePosition): string | undefined => {
    const reference = prompt(t('schema_editor.add_reference.prompt'));
    if (!reference) return undefined;
    if (savableModel.hasDefinition(reference)) {
      const { pointer } = savableModel.addReference(name, reference, target);
      return pointer;
    } else {
      alert(t('schema_editor.add_reference.type_does_not_exist', { reference }));
      return undefined;
    }
  };

  const addField = (name: string, target: NodePosition, fieldType?: FieldType): string => {
    const { pointer } = savableModel.addField(name, fieldType, target);
    return pointer;
  };

  const addCombination = (name: string, target: NodePosition): string => {
    const { pointer } = savableModel.addCombination(name, target);
    return pointer;
  };

  return addProperty;
};

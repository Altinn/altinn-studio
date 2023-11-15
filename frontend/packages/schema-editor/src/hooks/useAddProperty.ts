import { useSchemaEditorAppContext } from './useSchemaEditorAppContext';
import { FieldType, NodePosition, ObjectKind, ROOT_POINTER } from '../../../schema-model';

export const useAddProperty = () => {
  const { data, save } = useSchemaEditorAppContext();

  const addProperty = (objectKind: ObjectKind, fieldType?: FieldType, parentPointer: string = ROOT_POINTER): string | undefined => {

    const target: NodePosition = { parentPointer, index: -1 };
    const name = data.generateUniqueChildName(parentPointer, 'name');
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
    const reference = prompt('Oppgi navnet på typen det skal refereres til.');
    if (!reference) return undefined;
    if (data.hasDefinition(reference)) {
      const { pointer } = data.addReference(name, reference);
      save(data);
      return pointer;
    } else {
      alert(`Typen ${reference} finnes ikke.`);
      return undefined;
    }
  };

  const addField = (name: string, target: NodePosition, fieldType?: FieldType): string => {
    const { pointer } = data.addField(name, fieldType, target);
    save(data);
    return pointer;
  };

  const addCombination = (name: string, target: NodePosition): string => {
    const { pointer } = data.addCombination(name, target);
    save(data);
    return pointer;
  };

  return addProperty;
}

import { UiSchemaMap } from '../types';

export const findRequiredProps = (
  uiNodeMap: UiSchemaMap,
  parentPointer: string,
): string[] | undefined => {
  const uiSchemaNode = uiNodeMap.get(parentPointer);
  const required: string[] = [];
  uiSchemaNode?.children.forEach((childPointer) => {
    const child = uiNodeMap.get(childPointer);
    const childName = childPointer.split('/').pop();
    if (child?.isRequired && childName) {
      required.push(childName);
    }
  });
  return required.length > 0 ? required : undefined;
};

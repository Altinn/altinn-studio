import { UiSchemaNodes } from '../types';
import { getNodeByPointer } from '../selectors';

export const findRequiredProps = (
  uiSchemaNodes: UiSchemaNodes,
  parentPointer: string,
): string[] | undefined => {
  const uiSchemaNode = getNodeByPointer(uiSchemaNodes, parentPointer);
  const required: string[] = [];
  uiSchemaNode.children.forEach((childPointer) => {
    const child = getNodeByPointer(uiSchemaNodes, childPointer);
    const childName = childPointer.split('/').pop();
    if (child?.isRequired && childName) {
      required.push(childName);
    }
  });
  return required.length > 0 ? required : undefined;
};

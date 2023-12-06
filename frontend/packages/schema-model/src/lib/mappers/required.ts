import type { UiSchemaNodes } from '../../types';
import { getChildNodesByFieldPointer } from '../selectors';

export const findRequiredProps = (
  uiSchemaNodes: UiSchemaNodes,
  parentPointer: string,
): string[] | undefined => {
  const childNodes = getChildNodesByFieldPointer(uiSchemaNodes, parentPointer);
  const required: string[] = [];
  childNodes.forEach((child) => {
    const childName = child.pointer.split('/').pop();
    if (child.isRequired && childName) {
      required.push(childName);
    }
  });
  return required.length > 0 ? required : undefined;
};

import { UiSchemaMap } from '../types';

export const findRequiredProps = (
  uiNodeMap: UiSchemaMap,
  parentNodeId: number,
): string[] | undefined => {
  const uiSchemaNode = uiNodeMap.get(parentNodeId);
  const required: string[] = [];
  uiSchemaNode?.children.forEach((nodeId) => {
    const child = uiNodeMap.get(nodeId);
    const childName = child?.pointer.split('/').pop();
    if (child?.isRequired && childName) {
      required.push(childName);
    }
  });
  return required.length > 0 ? required : undefined;
};

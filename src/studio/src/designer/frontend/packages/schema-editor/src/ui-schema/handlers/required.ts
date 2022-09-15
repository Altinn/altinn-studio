import { UiSchemaNode } from '../types';

export const findRequiredProps = (
  parentNodeId: string,
  uiNodeMap: Map<string, UiSchemaNode>,
): string[] | undefined => {
  const uiSchemaNode = uiNodeMap.get(parentNodeId) as UiSchemaNode;
  const required: string[] = [];
  uiSchemaNode.children.forEach((nodeId) => {
    const child = uiNodeMap.get(nodeId) as UiSchemaNode;
    if (child.isRequired) {
      required.push(child.pointer.split('/').pop() as string);
    }
  });
  return required.length > 0 ? required : undefined;
};

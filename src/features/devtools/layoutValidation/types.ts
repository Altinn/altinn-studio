import type { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import type { CompIntermediate, CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';

export interface LayoutValidationCtx<T extends CompTypes> {
  node: LayoutNode<T>;
  item: CompIntermediate<T>;
  nodeDataSelector: NodeDataSelector;
  lookupBinding(binding: string): ReturnType<typeof lookupBindingInSchema>;
}

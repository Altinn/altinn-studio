import type { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import type { IDataModelReference } from 'src/layout/common.generated';
import type { CompIntermediateExact, CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodeDataSelector } from 'src/utils/layout/NodesContext';

export interface LayoutValidationCtx<T extends CompTypes> {
  node: LayoutNode<T>;
  item: CompIntermediateExact<T>;
  nodeDataSelector: NodeDataSelector;
  lookupBinding(reference: IDataModelReference): ReturnType<typeof lookupBindingInSchema>;
}

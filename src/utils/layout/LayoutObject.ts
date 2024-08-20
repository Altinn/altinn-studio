import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { TraversalTask } from 'src/utils/layout/useNodeTraversal';

/**
 * A layout object describes functionality implemented for both a LayoutPage (aka layout) and a
 * LayoutNode (aka an instance of a component inside a layout, or possibly inside a repeating group).
 */
export interface LayoutObject<Child extends LayoutNode | LayoutPage = LayoutNode> {
  closest(task: TraversalTask, passedFrom?: LayoutNode | LayoutPage | LayoutPages): LayoutNode | undefined;
  firstChild(task: TraversalTask): Child | undefined;
  children(task: TraversalTask): Child[];
  flat(task: TraversalTask): LayoutNode[];
}

import type { CompExceptGroup, CompInternal } from 'src/layout/layout';
import type { ChildLookupRestriction } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * A layout object describes functionality implemented for both a LayoutPage (aka layout) and a
 * LayoutNode (aka an instance of a component inside a layout, or possibly inside a repeating group).
 */
export interface LayoutObject<Item extends CompInternal = CompInternal, Child extends LayoutNode = LayoutNode> {
  /**
   * Looks for a matching component upwards in the hierarchy, returning the first one (or undefined if
   * none can be found)
   */
  closest(matching: (item: Item) => boolean): this | Child | undefined;

  /**
   * Returns a list of direct children, or finds the first node matching a given criteria
   */
  children(): Child[];
  children(matching: (item: Item) => boolean): Child | undefined;

  /**
   * This returns all the child nodes (including duplicate components for repeating groups) as a flat list of
   * LayoutNode objects.
   */
  flat(includeGroups: true, restriction?: ChildLookupRestriction): LayoutNode[];
  flat(includeGroups: false, restriction?: ChildLookupRestriction): LayoutNode<CompExceptGroup>[];
  flat(includeGroups: boolean, restriction?: ChildLookupRestriction): LayoutNode[];
}

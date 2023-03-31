import type { AnyItem, HComponent } from 'src/utils/layout/hierarchy.types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * A layout object describes functionality implemented for both a LayoutPage (aka layout) and a
 * LayoutNode (aka an instance of a component inside a layout, or possibly inside a repeating group).
 */
export interface LayoutObject<Item extends AnyItem = AnyItem, Child extends LayoutNode = LayoutNode> {
  /**
   * Looks for a matching component upwards in the hierarchy, returning the first one (or undefined if
   * none can be found)
   */
  closest(matching: (item: Item) => boolean): Child | undefined;

  /**
   * Returns a list of direct children, or finds the first node matching a given criteria
   */
  children(): Child[];

  children(matching: (item: Item) => boolean): Child | undefined;

  /**
   * This returns all the child nodes (including duplicate components for repeating groups) as a flat list of
   * LayoutNode objects.
   *
   * @param includeGroups If true, also includes the group nodes
   * @param onlyInRows
   */
  flat(includeGroups: true, onlyInRows?: number): LayoutNode[];

  flat(includeGroups: false, onlyInRows?: number): LayoutNode<HComponent>[];

  flat(includeGroups: boolean, onlyInRows?: number): LayoutNode[];
}

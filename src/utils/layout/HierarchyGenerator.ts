import { LayoutNode } from 'src/utils/layout/LayoutNode';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { LayoutPages } from 'src/utils/layout/LayoutPages';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { DefGetter } from 'src/layout';
import type { ComponentTypes, ILayout, ILayoutComponentExact, ILayouts } from 'src/layout/layout';
import type { IRepeatingGroups } from 'src/types';
import type { AnyItem, HierarchyDataSources, LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

export type UnprocessedItem<T extends ComponentTypes = ComponentTypes> = ExprUnresolved<ILayoutComponentExact<T>>;

export interface Claim {
  childId: string;
  parentId: string;
}

export interface CommonChildFactoryProps {
  parent: LayoutNode | LayoutPage;
  rowIndex?: number;
}

export interface ChildFactoryProps<T extends ComponentTypes> extends CommonChildFactoryProps {
  item: UnprocessedItem<T> | AnyItem<T>;
}

export type ChildFactory<T extends ComponentTypes> = (props: ChildFactoryProps<T>) => LayoutNode;
export type ChildMutator = (item: UnprocessedItem | AnyItem) => void;

export type HierarchyContext = {
  id: string;
  depth: number; // Starts at 1
  mutators: ChildMutator[];
};

export interface NewChildProps extends CommonChildFactoryProps {
  overrideParentId?: string;
  childPage?: string;
  childId: string;
  parentPage?: string;
  directMutators?: ChildMutator[];
  recursiveMutators?: ChildMutator[];
  ctx: HierarchyContext;
}

/**
 * The hierarchy generator solves the complicated puzzle of converting the flat layout structure into a hierarchy/tree
 * of LayoutNode objects - entirely without knowing anything about the relations between components and how the
 * hierarchy is structured in practice. It does this by providing tools so that each LayoutComponent class can perform
 * its job of claiming other components as children.
 *
 * This might look convoluted, but what happens here is that we go through some defined stages to make this happen:
 *
 * Stage 0
 * =======
 * We start with a flat layout. Imagine these components:
 *
 *    Component      Children (only for groups)
 *    --------------------------------------------
 *    mainGroup      [mainChild1, mainChild2, subGroup]
 *    mainChild1
 *    mainChild2
 *    subGroup       [subChild1, subSubGroup]
 *    subChild1
 *    subSubGroup    [subSubChild1]
 *    subSubChild1
 *
 * Stage 1
 * =======
 * Now we tell every component class in it to claim which one of the other components they want as their
 * children. When stage 1 is over, we'll end up with a structure that could be represented like this:
 *
 *    Component      Claimed by              Claims
 *    ---------------------------------------------------------------------
 *    mainGroup      unclaimed               [mainChild1, mainChild2, subGroup]
 *    mainChild1     claimed by mainGroup    []
 *    mainChild2     claimed by mainGroup    []
 *    subGroup       claimed by mainGroup    [subChild1, subSubGroup]
 *    subChild1      claimed by subGroup     []
 *    subSubGroup    claimed by subGroup     [subSubChild1]
 *    subSubChild1   claimed by subSubGroup  []
 *
 *    What happened in stage 1 was:
 *      - Every component got the chance to claim one or more children.
 *      - We marked which ones got claimed as children, and which ones didn't.
 *      - No IDs or other component properties is altered at this stage (objects are frozen), and every component class
 *        gets to have their say in which of the other components they want as children before we continue.
 *
 * Stage 2
 * =======
 * Now we have enough information to proceed to stage 2, where we can simply iterate all the unclaimed
 * components (these are the top-level ones) and use their factory implementations to generate a tree.
 *
 *    mainGroup
 *      rows[0] = [
 *        mainChild1-0
 *        mainChild2-0
 *        subGroup-0
 *          rows[0] = [
 *            subChild1-0-0
 *            subSubGroup-0-0
 *              rows[0] = [
 *                subSubChild1-0-0-0
 *              ]
 *          ]
 *      ]
 *
 *    What happened in stage 2 was:
 *      - All top-level components have their factory functions called, turning them into LayoutNode objects
 *      - Every top-level component with children realized their claims by instantiating copies of their claimed
 *        children.
 *      - Every child node/instance potentially have their properties mutated by parent mutators
 *      - Mutators are inherited in the hierarchy, meaning a mutator for a child of mainGroup also runs on the
 *        deepest item, subSubChild1-0-0-0.
 *      - All recursive mutators run in the order they were added. This means that for a deep node,
 *        mainGroup will run its mutators first (adding the first '-0' suffix to the ID) before the next depth level
 *        adds its mutations.
 *
 */
export class HierarchyGenerator {
  private allIds: Set<string> = new Set();
  private map: { [fullId: string]: UnprocessedItem } = {};
  private instances: { [type: string]: ComponentHierarchyGenerator<any> } = {};
  private unclaimed: Set<string> = new Set();
  private claims: { [fullChildId: string]: Set<string> } = {};

  private stage3callbacks: (() => void)[] = [];

  private top: LayoutPage;
  public topKey: string;

  public readonly pages: { [layoutKey: string]: LayoutPage } = {};

  constructor(
    private readonly layouts: ILayouts,
    public readonly repeatingGroups: IRepeatingGroups | null,
    public readonly dataSources: HierarchyDataSources,
    public readonly getLayoutComponentObject: DefGetter,
  ) {}

  /**
   * Claim another component as a child
   */
  claimChild(claim: Required<Claim>): void {
    const fullChildId = `${this.topKey}/${claim.childId}`;
    const fullParentId = `${this.topKey}/${claim.parentId}`;
    if (!this.allIds.has(fullChildId)) {
      console.warn(
        `Component ${fullParentId} tried to claim ${fullChildId} as a child, but a component with that ID is not defined`,
      );
      return;
    }

    this.claims[fullChildId] = this.claims[fullChildId] || new Set();
    const parents = this.claims[fullChildId];

    if (!parents.has(fullParentId) && parents.size > 0) {
      /**
       * TODO: Remove this to support multiple components claiming the same children. This could be useful for groups
       * with panel references, or repeating groups where you'd want to have one group with a filter and another one
       * with another filter (and still share the same children). However, in order to support this we need to get rid
       * of our limiting component id suffix (such as `currentValue-1` for the second row, because the `currentValue`
       * component could be claimed by multiple parents that each might want to create multiple instances of it).
       * If we go down this route, we also have to make sure Studio and app-lib-dotnet supports such configuration.
       * We might also want to support relative data model bindings, in order to support components that can be added
       * to different repeating (or non-repeating) groups with different data model bindings (but with the same base
       * model in place).
       * @see https://altinndevops.slack.com/archives/CDU1S3NLW/p1679044199116669
       */
      console.warn(
        `Component ${fullParentId} tried to claim ${fullChildId} as a child, but that child is already claimed by`,
        parents.values(),
      );
      return;
    }

    parents.add(fullParentId);
    this.unclaimed.delete(fullChildId);
  }

  /**
   * Utility for generating a new instance of a child (during stage 2), which must have
   * been claimed beforehand (in stage 1). Runs mutations and returns a LayoutNode.
   */
  newChild<T extends ComponentTypes>({
    ctx,
    childPage = this.topKey,
    childId,
    parentPage = this.topKey,
    parent,
    overrideParentId,
    rowIndex,
    directMutators = [],
    recursiveMutators = [],
  }: NewChildProps): LayoutNode | undefined {
    const parentId = overrideParentId || parent.item.baseComponentId || parent.item.id;
    const fullParentId = `${parentPage}/${parentId}`;
    const fullChildId = `${childPage}/${childId}`;
    if (!this.map[fullChildId]) {
      console.warn(
        `The component '${fullParentId}' tried to claim '${fullChildId}' as its child, but that component does not exist`,
      );
      return undefined;
    }
    if (!this.claims[fullChildId]) {
      throw new Error(`Tried to create a new child object for unclaimed '${fullChildId}'`);
    }

    if (parent instanceof LayoutPage) {
      throw new Error(`Tried to create a new child object for '${fullChildId}' which is not claimed by any parent`);
    }

    if (!parentId || !this.claims[fullChildId].has(fullParentId)) {
      const claimedBy = [...this.claims[fullChildId].values()].join(', ');
      console.warn(
        `Tried to create a new child object for '${fullChildId}' which is ` +
          `not claimed by '${fullParentId}' (but it is claimed by ${claimedBy})`,
      );
      return undefined;
    }

    const clone = structuredClone(this.map[fullChildId]) as UnprocessedItem<T>;

    const allMutators = [...ctx.mutators, ...directMutators, ...recursiveMutators];
    for (const mutator of allMutators) {
      mutator(clone);
    }

    const instance = this.getInstance(clone.type);
    if (!instance) {
      return undefined;
    }

    const factory: ChildFactory<T> = instance.stage2({
      id: childId,
      depth: ctx.depth + 1,
      mutators: [...ctx.mutators, ...recursiveMutators],
    });

    return factory({
      item: clone,
      parent,
      rowIndex,
    });
  }

  /**
   * Utility function to make it easier to create a LayoutNode object (used by processors in components)
   */
  makeNode<T extends ComponentTypes>({ item, parent, rowIndex }: ChildFactoryProps<T>): LayoutNodeFromType<T> {
    const node = new LayoutNode(item as AnyItem, parent || this.top, this.top, this.dataSources, rowIndex);
    this.top._addChild(node);

    return node as LayoutNodeFromType<T>;
  }

  /**
   * Gets the prototype of a given (base) component ID. This returns an un-editable object that is may be
   * useful when looking into the base definition/prototype of a component.
   */
  prototype(id: string): UnprocessedItem | undefined {
    const currenPageId = `${this.topKey}/${id}`;
    if (this.map[currenPageId]) {
      // Tries the current page first, to keep backwards compatibility
      return Object.freeze(structuredClone(this.map[currenPageId]));
    }

    for (const layoutKey of Object.keys(this.layouts)) {
      const fullId = `${layoutKey}/${id}`;
      if (this.map[fullId]) {
        return Object.freeze(structuredClone(this.map[fullId]));
      }
    }

    return undefined;
  }

  /**
   * Adds a callback to be run after stage 1 and 2 has been completed (for all pages)
   */
  addStage3Callback(callback: () => void) {
    this.stage3callbacks.push(callback);
  }

  /**
   * Gets the ComponentHierarchyGenerator instance for a given component type
   */
  private getInstance(type: ComponentTypes) {
    if (!this.instances[type]) {
      const def = this.getLayoutComponentObject(type);
      if (!def) {
        console.warn(`No component definition found for type '${type}'`);
        return;
      }
      this.instances[type] = def.hierarchyGenerator(this);
    }

    return this.instances[type];
  }

  /**
   * Runs the generator for all layouts
   * @see generateHierarchy
   * @see generateEntireHierarchy
   */
  run() {
    // Initialization and mapping
    for (const layoutKey of Object.keys(this.layouts)) {
      const layout = this.layouts[layoutKey];
      for (const component of layout || []) {
        const fullId = `${layoutKey}/${component.id}`;
        this.allIds.add(fullId);
        this.unclaimed.add(fullId);
        this.map[fullId] = component;
      }
    }

    // Stage 1
    for (const layoutKey of Object.keys(this.layouts)) {
      const layout = this.layouts[layoutKey];
      if (layout) {
        this.top = new LayoutPage();
        this.topKey = layoutKey;

        for (const item of layout) {
          const ro = Object.freeze(structuredClone(item));
          const instance = this.getInstance(ro.type);
          instance?.stage1(ro);
        }

        this.pages[layoutKey] = this.top;
      }
    }

    // Stage 2
    for (const layoutKey of Object.keys(this.layouts)) {
      const layout = this.layouts[layoutKey];
      if (layout) {
        this.top = this.pages[layoutKey];
        this.topKey = layoutKey;

        for (const fullId of this.unclaimed.values()) {
          if (!fullId.startsWith(`${layoutKey}/`)) {
            continue;
          }

          const plainId = fullId.substring(layoutKey.length + 1);
          const item = structuredClone(this.map[fullId]);
          const instance = this.getInstance(item.type);
          if (!instance) {
            continue;
          }
          const ctx: HierarchyContext = {
            id: plainId,
            depth: 1,
            mutators: [],
          };
          const processor = instance.stage2(ctx) as ChildFactory<ComponentTypes>;
          processor({ item, parent: this.top });
        }
      }
    }

    // Stage 3
    for (const callback of this.stage3callbacks) {
      callback();
    }
  }
}

/**
 * This class should be implemented in components that interacts with the hierarchy generation process. For simple
 * components that has no need to claim children or manipulate them, SimpleComponentHierarchyGenerator will
 * most likely suffice.
 */
export abstract class ComponentHierarchyGenerator<Type extends ComponentTypes> {
  constructor(protected generator: HierarchyGenerator) {}

  abstract stage1(item: UnprocessedItem<Type>): void;
  abstract stage2(ctx: HierarchyContext): ChildFactory<Type>;
}

/**
 * Most simple components does not need to claim any children, so they can use this standard implementation
 */
export class SimpleComponentHierarchyGenerator<Type extends ComponentTypes> extends ComponentHierarchyGenerator<Type> {
  stage1() {
    return undefined;
  }

  stage2(): ChildFactory<Type> {
    return (props) => this.generator.makeNode(props);
  }
}

export function generateHierarchy(
  layout: ILayout,
  repeatingGroups: IRepeatingGroups,
  dataSources: HierarchyDataSources,
  getLayoutComponentObject: DefGetter,
): LayoutPage {
  const clone = structuredClone({ FormLayout: layout }) as ILayouts;
  const generator = new HierarchyGenerator(clone, repeatingGroups, dataSources, getLayoutComponentObject);
  generator.run();

  return generator.pages.FormLayout;
}

export function generateEntireHierarchy(
  layouts: ILayouts,
  currentView: string,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
  getLayoutComponentObject: DefGetter,
): LayoutPages {
  const generator = new HierarchyGenerator(layouts, repeatingGroups, dataSources, getLayoutComponentObject);
  generator.run();

  return new LayoutPages(currentView as keyof typeof generator.pages, generator.pages);
}

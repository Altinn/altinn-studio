import { evalExprInObj, ExprDefaultsForComponent, ExprDefaultsForGroup } from 'src/features/expressions';
import { DataBinding } from 'src/utils/databindings/DataBinding';
import { getRepeatingGroupStartStopIndex } from 'src/utils/formLayout';
import { buildInstanceContext } from 'src/utils/instanceContext';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { ILayout, ILayoutComponent, ILayoutComponentOrGroup, ILayoutGroup } from 'src/features/form/layout';
import type { IRepeatingGroups, IRuntimeState } from 'src/types';
import type {
  AnyChildNode,
  AnyItem,
  AnyNode,
  AnyParentNode,
  AnyTopLevelItem,
  AnyTopLevelNode,
  ComponentOf,
  HierarchyWithRows,
  LayoutGroupHierarchy,
  NodeType,
  RepeatingGroupExtensions,
  RepeatingGroupHierarchy,
  RepeatingGroupLayoutComponent,
} from 'src/utils/layout/hierarchy.types';

const componentInGroupChildren = (
  group: ILayoutGroup,
  componentId: string,
): { found: boolean; multiPageIndex?: number } => {
  if (group.edit?.multiPage) {
    const split = group.children.map((id) => id.split(':'));
    const found = split.find(([, id]) => id === componentId);
    if (found) {
      return {
        found: true,
        multiPageIndex: parseInt(found[0]),
      };
    }

    return { found: false };
  }

  return { found: group.children.includes(componentId) };
};

export const childrenWithoutMultiPagePrefix = (group: ILayoutGroup) =>
  group.edit?.multiPage ? group.children.map((componentId) => componentId.replace(/^\d+:/g, '')) : group.children;

function componentsAndGroupsInGroup(
  layout: ILayout,
  filter: (component: ILayoutComponent | ILayoutGroup) => false | ILayoutComponentOrGroup,
): (ILayoutComponent | LayoutGroupHierarchy)[] {
  const all = layout.map(filter).filter((c) => c !== false) as ILayoutComponentOrGroup[];
  const groups = all.filter((component) => component.type === 'Group') as ILayoutGroup[];
  const components = all.filter((component) => component.type !== 'Group') as ILayoutComponent[];

  return [
    ...components,
    ...groups.map((group) => {
      const out: LayoutGroupHierarchy = {
        ...group,
        childComponents: componentsAndGroupsInGroup(layout, (component) => {
          const result = componentInGroupChildren(group, component.id);
          if (result.found && typeof result.multiPageIndex === 'number') {
            return { ...component, multiPageIndex: result.multiPageIndex };
          }

          return result.found ? component : false;
        }),
      };
      delete out['children'];

      return out;
    }),
  ];
}

/**
 * Takes a flat layout and turns it into a hierarchy. That means, each group component will not have
 * references to each component inside the group, it will have the component definitions themselves
 * nested inside the 'childComponents' property.
 *
 * If this abstraction level is not fine enough for you, you might want to look into these utils:
 *    layoutAsHierarchyWithRows() takes this further by giving you a all the components as a hierarchy,
 *        but also includes every component in a repeating group multiple times (for each row in the group).
 *        It will also give you proper componentIds and dataModelBindings for the component so you
 *        can reference validations, attachments, formData, etc.
 *    nodesInLayout() takes it even further, but also simplifies the structure by giving you
 *        a flat list. This list includes all components (multiple instances of them for rows in
 *        repeating groups), but wraps them in a class which is aware of the component location
 *        inside the whole layout, allowing you to, for example, find a sibling instance of a
 *        component inside a repeating group - complete with proper componentId and dataModelBindings.
 *
 * Note: This strips away multiPage functionality and treats every component of a multiPage group
 * as if every component is on the same page.
 */
export function layoutAsHierarchy(layout: ILayout): (ILayoutComponent | LayoutGroupHierarchy)[] {
  const allGroups = layout.filter((value) => value.type === 'Group');
  const inGroups = allGroups.map(childrenWithoutMultiPagePrefix).flat();
  const topLevelFields = layout
    .filter((component) => component.type !== 'Group' && !inGroups.includes(component.id))
    .map((component) => component.id);
  const topLevelGroups = allGroups.filter((group) => !inGroups.includes(group.id)).map((group) => group.id);

  return componentsAndGroupsInGroup(
    layout,
    (component) => (topLevelFields.includes(component.id) || topLevelGroups.includes(component.id)) && component,
  );
}

interface HierarchyParent {
  index: number;
  binding?: string;
}

/**
 * This function takes the logic from layoutAsHierarchy() further by giving you a all the components as a hierarchy,
 * but it also includes every component in a repeating group multiple times (for each row in the group). It will also
 * give you proper componentIds and dataModelBindings for the component so you can reference validations, attachments,
 * formData, etc.
 *
 * If this abstraction level is not the right one for your needs, you might want to look into these utils:
 *    layoutAsHierarchy() is a bit simpler, as it converts a simple flat layout into a hierarchy
 *        of components - although it doesn't know anything about repeating groups and their rows.
 *    nodesInLayout() takes it even further, but also simplifies the structure by giving you
 *        a flat list. This list includes all components (multiple instances of them for rows in
 *        repeating groups), but wraps them in a class which is aware of the component location
 *        inside the whole layout, allowing you to, for example, find a sibling instance of a
 *        component inside a repeating group - complete with proper componentId and dataModelBindings.
 *
 * Note: This strips away multiPage functionality and treats every component of a multiPage group
 * as if every component is on the same page.
 */
export function layoutAsHierarchyWithRows(
  formLayout: ILayout,
  repeatingGroups: IRepeatingGroups | null,
): HierarchyWithRows[] {
  const rewriteBindings = (
    main: LayoutGroupHierarchy,
    child: LayoutGroupHierarchy | ILayoutComponent,
    newChild: RepeatingGroupLayoutComponent,
    parent: HierarchyParent | undefined,
    index: number,
  ) => {
    const baseGroupBinding =
      (main as RepeatingGroupExtensions).baseDataModelBindings?.group || main.dataModelBindings?.group;

    let binding = main.dataModelBindings?.group;
    if (binding && parent && baseGroupBinding) {
      binding = binding.replace(baseGroupBinding, `${parent.binding}`);
    }

    newChild.baseDataModelBindings = { ...child.dataModelBindings };
    if (child.dataModelBindings && newChild.dataModelBindings) {
      for (const key of Object.keys(child.dataModelBindings)) {
        newChild.dataModelBindings[key] = child.dataModelBindings[key].replace(
          baseGroupBinding,
          `${binding}[${index}]`,
        );
      }
    }
  };

  const recurse = (main: ILayoutComponent | LayoutGroupHierarchy, parent?: HierarchyParent) => {
    if (main.type === 'Group' && main.maxCount && main.maxCount > 1) {
      const rows: RepeatingGroupHierarchy['rows'] = [];
      const { startIndex, stopIndex } = getRepeatingGroupStartStopIndex(
        (repeatingGroups || {})[main.id]?.index,
        main.edit,
      );
      for (let index = startIndex; index <= stopIndex; index++) {
        const items = main.childComponents.map((child) => {
          const suffix = parent ? `-${parent.index}-${index}` : `-${index}`;
          const newId = `${child.id}${suffix}`;
          const newChild: RepeatingGroupLayoutComponent = {
            ...JSON.parse(JSON.stringify(child)),
            id: newId,
            baseComponentId: child.id,
          };

          if (child.dataModelBindings) {
            rewriteBindings(main, child, newChild, parent, index);
          }

          return recurse(newChild, {
            index,
            binding: main.dataModelBindings?.group,
          });
        });
        rows.push({ items, index });
      }

      const out: RepeatingGroupHierarchy = { ...main, rows };
      delete out['childComponents'];
      return out;
    }

    return main as RepeatingGroupLayoutComponent;
  };

  return layoutAsHierarchy(formLayout).map((child) => recurse(child));
}

/**
 * A layout object describes functionality implemented for both a LayoutRootNode (aka a page, or layout) and a
 * LayoutNode (aka an instance of a component inside a layout, or possibly inside a repeating group).
 */
export interface LayoutObject<
  NT extends NodeType = 'unresolved',
  Item extends AnyItem<NT> = AnyItem<NT>,
  Child extends AnyNode<NT> = AnyNode<NT>,
> {
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
  flat(includeGroups: true, onlyInRows?: number): AnyChildNode<NT>[];
  flat(includeGroups: false, onlyInRows?: number): LayoutNode<NT, ComponentOf<NT>>[];
  flat(includeGroups: boolean, onlyInRows?: number): AnyChildNode<NT>[];
}

/**
 * The layout root node is a class containing an entire page/form layout, with all components/nodes within it. It
 * allows for fast/indexed searching, i.e. looking up an exact node in constant time.
 */
export class LayoutRootNode<NT extends NodeType = 'unresolved'>
  implements LayoutObject<NT, AnyTopLevelItem<NT>, AnyTopLevelNode<NT>>
{
  public item: Record<string, undefined> = {};
  public parent: this;

  private directChildren: AnyTopLevelNode<NT>[] = [];
  private allChildren: AnyChildNode<NT>[] = [];
  private idMap: { [id: string]: number[] } = {};

  /**
   * Adds a child to the collection. For internal use only.
   */
  public _addChild(child: AnyChildNode<NT>) {
    if (child.parent === this) {
      this.directChildren.push(child as AnyTopLevelNode<NT>);
    }
    const idx = this.allChildren.length;
    this.allChildren.push(child);

    this.idMap[child.item.id] = this.idMap[child.item.id] || [];
    this.idMap[child.item.id].push(idx);

    const baseComponentId: string | undefined = child.item.baseComponentId;
    if (baseComponentId) {
      this.idMap[baseComponentId] = this.idMap[baseComponentId] || [];
      this.idMap[baseComponentId].push(idx);
    }
  }

  /**
   * Looks for a matching component upwards in the hierarchy, returning the first one (or undefined if
   * none can be found). Implemented here for parity with LayoutNode
   */
  public closest(matching: (item: AnyTopLevelItem<NT>) => boolean): AnyTopLevelNode<NT> | undefined {
    return this.children(matching);
  }

  /**
   * Returns a list of direct children, or finds the first node matching a given criteria. Implemented
   * here for parity with LayoutNode.
   */
  public children(): AnyTopLevelNode<NT>[];
  public children(matching: (item: AnyTopLevelItem<NT>) => boolean): AnyTopLevelNode<NT> | undefined;
  public children(matching?: (item: AnyTopLevelItem<NT>) => boolean): any {
    if (!matching) {
      return this.directChildren;
    }

    for (const item of this.directChildren) {
      if (matching(item.item)) {
        return item;
      }
    }

    return undefined;
  }

  /**
   * This returns all the child nodes (including duplicate components for repeating groups) as a flat list of
   * LayoutNode objects.
   *
   * @param includeGroups If true, also includes the group nodes
   */
  public flat(includeGroups: true): AnyChildNode<NT>[];
  public flat(includeGroups: false): LayoutNode<NT, ComponentOf<NT>>[];
  public flat(includeGroups: boolean): AnyChildNode<NT>[] {
    if (!includeGroups) {
      return this.allChildren.filter((c) => c.item.type !== 'Group');
    }

    return this.allChildren;
  }

  public findById(id: string): AnyChildNode<NT> | undefined {
    if (this.idMap[id] && this.idMap[id].length) {
      return this.allChildren[this.idMap[id][0]];
    }

    return undefined;
  }

  public findAllById(id: string): AnyChildNode<NT>[] {
    if (this.idMap[id] && this.idMap[id].length) {
      return this.idMap[id].map((idx) => this.allChildren[idx]);
    }

    return [];
  }
}

/**
 * A LayoutNode wraps a component with information about its parent, allowing you to traverse a component (or an
 * instance of a component inside a repeating group), finding other components near it.
 */
export class LayoutNode<NT extends NodeType = 'unresolved', Item extends AnyItem<NT> = AnyItem<NT>>
  implements LayoutObject<NT, AnyItem<NT>, AnyNode<NT>>
{
  public constructor(
    public item: Item,
    public parent: AnyParentNode<NT>,
    public top: LayoutRootNode<NT>,
    public readonly rowIndex?: number,
  ) {}

  /**
   * Looks for a matching component upwards in the hierarchy, returning the first one (or undefined if
   * none can be found).
   */
  public closest(matching: (item: AnyItem<NT>) => boolean): this | AnyNode<NT> | undefined {
    if (matching(this.item)) {
      return this;
    }

    const sibling = this.parent.children(matching, this.rowIndex);
    if (sibling) {
      return sibling as AnyNode<NT>;
    }

    return this.parent.closest(matching);
  }

  private recurseParents(callback: (node: AnyParentNode<NT>) => void) {
    callback(this.parent);
    if (!(this.parent instanceof LayoutRootNode)) {
      this.parent.recurseParents(callback);
    }
  }

  /**
   * Like children(), but will only match upwards along the tree towards the top (LayoutRootNode)
   */
  public parents(matching?: (item: AnyParentNode<NT>) => boolean): AnyParentNode<NT>[] {
    const parents: AnyParentNode<NT>[] = [];
    this.recurseParents((node) => parents.push(node));

    if (matching) {
      return parents.filter(matching);
    }

    return parents;
  }

  private childrenIdsAsList(onlyInRowIndex?: number) {
    let list: AnyItem<NT>[] = [];
    if (this.item.type === 'Group' && 'rows' in this.item) {
      if (typeof onlyInRowIndex === 'number') {
        list = this.item.rows.find((r) => r.index === onlyInRowIndex)?.items || [];
      } else {
        // Beware: In most cases this will just match the first row.
        list = Object.values(this.item.rows)
          .map((r) => r.items)
          .flat();
      }
    } else if (this.item.type === 'Group' && 'childComponents' in this.item) {
      list = this.item.childComponents;
    }

    return list.map((item) => item.id);
  }

  /**
   * Looks for a matching component inside the children of this node (only makes sense for a group node). Beware that
   * matching inside a repeating group with multiple rows, you should provide a second argument to specify the row
   * number, otherwise you'll most likely just find a component on the first row.
   */
  public children(): AnyNode<NT>[];
  public children(matching: (item: AnyItem<NT>) => boolean, onlyInRowIndex?: number): AnyNode<NT> | undefined;
  public children(matching: undefined, onlyInRowIndex?: number): AnyNode<NT>[];
  public children(matching?: (item: AnyItem<NT>) => boolean, onlyInRowIndex?: number): any {
    const list = this.childrenIdsAsList(onlyInRowIndex);

    if (!matching) {
      if (!list) {
        return [];
      }
      return list.map((id) => this.top.findById(id));
    }

    if (typeof list !== 'undefined') {
      for (const id of list) {
        const node = this.top.findById(id);
        if (node && matching(node.item)) {
          return node;
        }
      }
    }

    return undefined;
  }

  /**
   * This returns all the child nodes (including duplicate components for repeating groups) as a flat list of
   * LayoutNode objects. Implemented here for parity with LayoutRootNode.
   *
   * @param includeGroups If true, also includes the group nodes (which also includes self, when this node is a group)
   * @param onlyInRowIndex If set, it will only include children with the given row index. It will still include all
   *        children of nested groups regardless of row-index.
   */
  public flat(includeGroups: true, onlyInRowIndex?: number): AnyChildNode<NT>[];
  public flat(includeGroups: false, onlyInRowIndex?: number): LayoutNode<NT, ComponentOf<NT>>[];
  public flat(includeGroups: boolean, onlyInRowIndex?: number): AnyChildNode<NT>[] {
    const out: AnyChildNode<NT>[] = [];
    const recurse = (item: AnyChildNode<NT>, rowIndex?: number) => {
      if (includeGroups || item.item.type !== 'Group') {
        out.push(item);
      }
      for (const child of item.children(undefined, rowIndex)) {
        recurse(child);
      }
    };

    recurse(this, onlyInRowIndex);
    return out;
  }

  /**
   * Checks if this field should be hidden. This also takes into account the group this component is in, so the
   * methods returns true if the component is inside a hidden group.
   */
  public isHidden(hiddenFieldIds: Set<string>): boolean {
    if (this.item.hidden === true || hiddenFieldIds.has(this.item.id)) {
      return true;
    }
    if (this.item.baseComponentId && hiddenFieldIds.has(this.item.baseComponentId)) {
      return true;
    }

    const parentGroups = this.parents(
      (parent) => parent instanceof LayoutNode && parent.item.type === 'Group',
    ) as LayoutNode<NT>[];

    for (const parent of parentGroups) {
      if (parent.item.hidden === true || hiddenFieldIds.has(parent.item.id)) {
        return true;
      }
      if (parent.item.baseComponentId && hiddenFieldIds.has(parent.item.baseComponentId)) {
        return true;
      }
    }

    return false;
  }

  private firstDataModelBinding() {
    const firstBinding = Object.keys(this.item.dataModelBindings || {}).shift();
    if (firstBinding && this.item.dataModelBindings) {
      return this.item.dataModelBindings[firstBinding];
    }

    return undefined;
  }

  /**
   * This takes a dataModel path (without indexes) and alters it to add indexes such that the data model path refers
   * to an item in the same repeating group row (or nested repeating group row) as the data model for the current
   * component.
   *
   * Example: Let's say this component is in the second row of the first repeating group, and inside the third row
   * of a nested repeating group. Our data model binding is such:
   *    simpleBinding: 'MyModel.Group[1].NestedGroup[2].FirstName'
   *
   * If you pass the argument 'MyModel.Group.NestedGroup.Age' to this function, you'll get the
   * transposed binding back: 'MyModel.Group[1].NestedGroup[2].Age'.
   *
   * If you pass the argument 'MyModel.Group[2].NestedGroup[3].Age' to this function, it will still be transposed to
   * the current row indexes: 'MyModel.Group[1].NestedGroup[2].Age' unless you pass overwriteOtherIndices = false.
   */
  public transposeDataModel(dataModel: string, rowIndex?: number): string {
    const firstBinding = this.firstDataModelBinding();
    if (!firstBinding) {
      if (this.parent instanceof LayoutNode) {
        return this.parent.transposeDataModel(dataModel, this.rowIndex);
      }

      return dataModel;
    }

    const ourBinding = new DataBinding(firstBinding);
    const theirBinding = new DataBinding(dataModel);
    const lastIdx = ourBinding.parts.length - 1;

    for (const ours of ourBinding.parts) {
      const theirs = theirBinding.at(ours.parentIndex);

      if (ours.base !== theirs?.base) {
        break;
      }

      const arrayIndex = ours.parentIndex === lastIdx && this.item.type === 'Group' ? rowIndex : ours.arrayIndex;

      if (arrayIndex === undefined) {
        continue;
      }

      if (theirs.hasArrayIndex()) {
        // Stop early. We cannot add our row index here, because it makes no sense when an earlier group
        // index changed.we cannot possibly
        break;
      }

      theirs.arrayIndex = arrayIndex;
    }

    return theirBinding.toString();
  }
}

/**
 * Takes the layoutAsHierarchyWithRows() tool a bit further, but returns a flat list. This list includes all components
 * (multiple instances of them for rows in repeating groups), but wraps them in a LayoutNode object which is aware of the
 * component location inside the whole layout, allowing you to, for example, find a sibling instance of a component
 * inside a repeating group - complete with proper componentId and dataModelBindings.
 *
 * If this abstraction level is overkill for you, you might want to look into these utils:
 *    layoutAsHierarchy() is much simpler, as it converts a simple flat layout into a hierarchy
 *        of components - although it doesn't know anything about repeating groups and their rows.
 *    layoutAsHierarchyWithRows() is a bit simpler by giving you a all the components as a hierarchy,
 *        but also includes every component in a repeating group multiple times (for each row in the group).
 *        It will also give you proper componentIds and dataModelBindings for the component so you
 *        can reference validations, attachments, formData, etc. However, it might be harder to
 *        use if you know exactly which component you're looking for, if recursive iteration makes
 *        things more difficult, or if you need to traverse through the layout more than once.
 *
 * Note: This strips away multiPage functionality and treats every component of a multiPage group
 * as if every component is on the same page.
 *
 * @see resolvedNodesInLayout
 *  An alternative that also resolves expressions for all nodes in the layout
 */
export function nodesInLayout(
  formLayout: ILayout | undefined | null,
  repeatingGroups: IRepeatingGroups | null,
): LayoutRootNode {
  const root = new LayoutRootNode();

  const recurse = (
    list: (ILayoutComponent | LayoutGroupHierarchy | RepeatingGroupHierarchy)[],
    parent: AnyParentNode,
    rowIndex?: number,
  ) => {
    for (const component of list) {
      if (component.type === 'Group' && 'rows' in component) {
        const group: AnyParentNode = new LayoutNode(component, parent, root, rowIndex);
        component.rows.forEach((row) => recurse(row.items, group, row.index));
        root._addChild(group);
      } else if (component.type === 'Group' && 'childComponents' in component) {
        const group = new LayoutNode(component, parent, root, rowIndex);
        recurse(component.childComponents, group);
        root._addChild(group);
      } else {
        const node = new LayoutNode(component, parent, root, rowIndex);
        root._addChild(node);
      }
    }
  };

  if (formLayout) {
    recurse(layoutAsHierarchyWithRows(formLayout, repeatingGroups), root);
  }

  return root;
}

/**
 * This is the same tool as the one above, but additionally it will iterate each component/group in the layout
 * and resolve all expressions for it.
 *
 * @see nodesInLayout
 */
export function resolvedNodesInLayout(
  formLayout: ILayout,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: ContextDataSources,
): LayoutRootNode<'resolved'> {
  // A full copy is needed here because formLayout comes from the redux store, and in production code (not the
  // development server!) the properties are not mutable (but we have to mutate them below).
  const layoutCopy = JSON.parse(JSON.stringify(formLayout));
  const unresolved = nodesInLayout(layoutCopy, repeatingGroups);

  for (const node of unresolved.flat(true)) {
    const input = { ...node.item };
    delete input['children'];
    delete input['rows'];
    delete input['childComponents'];

    const resolvedItem = evalExprInObj({
      input,
      node,
      dataSources,
      defaults: {
        ...ExprDefaultsForComponent,
        ...ExprDefaultsForGroup,
      } as any,
    }) as unknown as AnyItem<'resolved'>;

    for (const key of Object.keys(resolvedItem)) {
      // Mutates node.item directly - this also mutates references to it and makes sure
      // we resolve expressions deep inside recursive structures.
      node.item[key] = resolvedItem[key];
    }
  }

  return unresolved as unknown as LayoutRootNode<'resolved'>;
}

/**
 * A tool when you have more than one LayoutRootNode (i.e. a full layout set). It can help you look up components
 * by ID, and if you have colliding component IDs in multiple layouts it will prefer the one in the current layout.
 */
export class LayoutRootNodeCollection<
  NT extends NodeType = 'unresolved',
  Collection extends { [layoutKey: string]: LayoutRootNode<NT> } = {
    [layoutKey: string]: LayoutRootNode<NT>;
  },
> {
  public constructor(private currentView: keyof Collection, private objects: Collection) {}

  public findComponentById(id: string): LayoutNode<NT> | undefined {
    const current = this.current();
    if (current) {
      const inCurrent = this.current().findById(id);
      if (inCurrent) {
        return inCurrent;
      }
    }

    for (const otherLayoutKey of Object.keys(this.objects)) {
      if (otherLayoutKey === this.currentView) {
        continue;
      }
      const inOther = this.objects[otherLayoutKey].findById(id);
      if (inOther) {
        return inOther;
      }
    }

    return undefined;
  }

  public findAllComponentsById(id: string): LayoutNode<NT>[] {
    const out: LayoutNode<NT>[] = [];

    for (const key of Object.keys(this.objects)) {
      out.push(...this.objects[key].findAllById(id));
    }

    return out;
  }

  public findLayout(key: keyof Collection): LayoutRootNode<NT> {
    return this.objects[key];
  }

  public current(): LayoutRootNode<NT> {
    return this.objects[this.currentView];
  }

  public all(): Collection {
    return this.objects;
  }
}

export function dataSourcesFromState(state: IRuntimeState): ContextDataSources {
  return {
    formData: state.formData.formData,
    applicationSettings: state.applicationSettings.applicationSettings,
    instanceContext: buildInstanceContext(state.instanceData?.instance),
  };
}

export function resolvedLayoutsFromState(state: IRuntimeState): LayoutRootNodeCollection<'resolved'> {
  const layoutsAsNodes = {};
  const dataSources = dataSourcesFromState(state);
  const layouts = state.formLayout.layouts || {};
  for (const key of Object.keys(layouts)) {
    layoutsAsNodes[key] = resolvedNodesInLayout(
      layouts[key] || [],
      state.formLayout.uiConfig.repeatingGroups,
      dataSources,
    );
  }

  return new LayoutRootNodeCollection(
    state.formLayout.uiConfig.currentView as keyof typeof layoutsAsNodes,
    layoutsAsNodes,
  );
}

import type { $Values } from 'utility-types';

import { evalExprInObj, ExprConfigForComponent, ExprConfigForGroup } from 'src/features/expressions';
import { getLayoutComponentObject } from 'src/layout';
import { INDEX_KEY_INDICATOR_REGEX } from 'src/utils/databindings';
import { DataBinding } from 'src/utils/databindings/DataBinding';
import { getRepeatingGroupStartStopIndex } from 'src/utils/formLayout';
import { buildInstanceContext } from 'src/utils/instanceContext';
import type { ExprResolved, ExprUnresolved } from 'src/features/expressions/types';
import type { ComponentClassMap } from 'src/layout';
import type {
  IDataModelBindings,
  ILayout,
  ILayoutComponent,
  ILayoutComponentOrGroup,
  ILayouts,
} from 'src/layout/layout';
import type { LayoutComponent } from 'src/layout/LayoutComponent';
import type {
  IComponentBindingValidation,
  IComponentValidations,
  IMapping,
  IRepeatingGroups,
  IRuntimeState,
  ITextResource,
  ValidationKeyOrAny,
} from 'src/types';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type {
  AnyItem,
  HComponent,
  HComponentInRepGroup,
  HierarchyDataSources,
  HNonRepGroup,
  HRepGroup,
  HRepGroupChild,
  HRepGroupExtensions,
  ParentNode,
} from 'src/utils/layout/hierarchy.types';

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
function layoutAsHierarchy(originalLayout: ILayout): (ILayoutComponent | HNonRepGroup)[] {
  const layoutAsMap: { [id: string]: ExprUnresolved<ILayoutComponentOrGroup> } = {};
  const layoutCopy = JSON.parse(JSON.stringify(originalLayout)) as ILayout;
  for (const component of layoutCopy) {
    layoutAsMap[component.id] = component;
  }

  const idsInGroups = new Set<string>();
  for (const component of layoutCopy) {
    if (component.type !== 'Group') {
      continue;
    }

    const children: { id: string; index?: number }[] = component.edit?.multiPage
      ? component.children.map((compoundId) => {
          const [multiPageIndex, id] = compoundId.split(':');
          return { id, index: parseInt(multiPageIndex) };
        })
      : component.children.map((id) => ({ id }));

    const childComponents = children
      .map((child) => {
        const component = layoutAsMap[child.id];
        if (component) {
          idsInGroups.add(child.id);

          if (typeof child.index === 'number') {
            component['multiPageIndex'] = child.index;
          }

          return component;
        }

        return false;
      })
      .filter((child) => !!child) as (ILayoutComponent | HNonRepGroup)[];

    delete (component as any)['children'];
    component['childComponents'] = childComponents;
  }

  const out = layoutCopy.filter((c) => !idsInGroups.has(c.id));
  return out as (ILayoutComponent | HNonRepGroup)[];
}

interface HierarchyParent {
  index: number;
  binding?: string;
}

/**
 * Types of possible components on the top level of a repeating group hierarchy with rows
 */
type HierarchyWithRows = HComponent | HNonRepGroup | HRepGroup;

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
function layoutAsHierarchyWithRows(formLayout: ILayout, repeatingGroups: IRepeatingGroups | null): HierarchyWithRows[] {
  const rewriteDataModelBindings = (
    main: HNonRepGroup | HRepGroup,
    child: HNonRepGroup | HComponent,
    newChild: HComponentInRepGroup,
    parent: HierarchyParent | undefined,
    index: number,
  ) => {
    const baseGroupBinding =
      (main as HRepGroupExtensions).baseDataModelBindings?.group || main.dataModelBindings?.group;

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

  const rewriteMappingReferences = (
    newChild: HComponentInRepGroup,
    parent: HierarchyParent | undefined,
    index: number,
  ) => {
    if (!('mapping' in newChild) || !newChild.mapping) {
      return;
    }

    const indexes = parent ? [parent.index, index] : [index];
    const mappingKeys = Object.keys(newChild.mapping);
    const newMapping: IMapping = {};
    for (const oldKey of mappingKeys) {
      let newKey = oldKey;
      for (const i of indexes) {
        newKey = newKey.replace(INDEX_KEY_INDICATOR_REGEX, `[${i}]`);
      }
      newMapping[newKey] = newChild.mapping[oldKey];
    }

    newChild.mapping = newMapping;
  };

  const repGroups: { [id: string]: HRepGroup } = {};
  const groupReferences: HNonRepGroup[] = [];
  const recurse = (main: ILayoutComponent | HNonRepGroup | HComponentInRepGroup, parent?: HierarchyParent) => {
    if (main.type === 'Group' && main.maxCount && main.maxCount > 1) {
      const rows: HRepGroup['rows'] = [];
      const { startIndex, stopIndex } = getRepeatingGroupStartStopIndex(
        (repeatingGroups || {})[main.id]?.index,
        main.edit,
      );
      for (let index = startIndex; index <= stopIndex; index++) {
        const items = main.childComponents.map((child) => {
          const suffix = parent ? `-${parent.index}-${index}` : `-${index}`;
          const newId = `${child.id}${suffix}`;
          const newChild: HComponentInRepGroup = {
            ...JSON.parse(JSON.stringify(child)),
            id: newId,
            baseComponentId: child.id,
          };

          if (child.dataModelBindings) {
            rewriteDataModelBindings(main, child, newChild, parent, index);
          }

          rewriteMappingReferences(newChild, parent, index);

          return recurse(newChild, {
            index,
            binding: main.dataModelBindings?.group,
          });
        });
        rows.push({ items, index });
      }

      const out: HRepGroup = { ...main, rows };
      delete out['childComponents'];
      repGroups[main.id] = out;
      return out;
    } else if (main.type === 'Group' && main.panel && main.panel.groupReference?.group) {
      // We need to iterate once more for group references to work, as we don't know if the references group has had
      // their data model bindings mapped yet.
      groupReferences.push(main);
    }

    return main as HComponentInRepGroup;
  };

  const resolveGroupReferences = () => {
    for (const main of groupReferences) {
      const reference = main.panel?.groupReference?.group;
      const referencedGroup = reference ? repGroups[reference] : undefined;
      const referencedGroupState = reference && repeatingGroups ? repeatingGroups[reference] : undefined;
      if (!reference || !referencedGroup || !referencedGroupState) {
        // TODO: Show validations like these to the app developers more clearly
        console.warn(
          'Found panel with groupReference (',
          main.id,
          ') that references a non-existing or non-repeating group (',
          main.panel?.groupReference?.group,
          ')',
        );
        continue;
      }
      main.childComponents = main.childComponents.map((child) => {
        const nextIndex = referencedGroupState.index + 1;
        const newChild: HComponentInRepGroup = {
          ...JSON.parse(JSON.stringify(child)),
          id: `${child.id}-${nextIndex}`,
          baseComponentId: child.id,
        };

        if (child.dataModelBindings) {
          rewriteDataModelBindings(referencedGroup, child, newChild, undefined, nextIndex);
        }

        rewriteMappingReferences(newChild, undefined, nextIndex);

        return newChild;
      });
    }
  };

  const out = layoutAsHierarchy(formLayout).map((child) => recurse(child));
  groupReferences.length && resolveGroupReferences();
  return out;
}

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

/**
 * The layout page is a class containing an entire page/form layout, with all components/nodes within it. It
 * allows for fast/indexed searching, i.e. looking up an exact node in constant time.
 */
export class LayoutPage implements LayoutObject {
  public item: Record<string, undefined> = {};
  public parent: this;
  public top: { myKey: string; collection: LayoutPages };

  private directChildren: LayoutNode[] = [];
  private allChildren: LayoutNode[] = [];
  private idMap: { [id: string]: number[] } = {};

  /**
   * Adds a child to the collection. For internal use only.
   */
  public _addChild(child: LayoutNode) {
    if (child.parent === this) {
      this.directChildren.push(child as LayoutNode);
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
  public closest(matching: (item: AnyItem) => boolean, traversePages = true): LayoutNode | undefined {
    const out = this.children(matching);
    if (out) {
      return out;
    }

    if (traversePages && this.top) {
      const otherLayouts = this.top.collection.flat(this.top.myKey);
      for (const page of otherLayouts) {
        const found = page.closest(matching, false);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  /**
   * Returns a list of direct children, or finds the first node matching a given criteria. Implemented
   * here for parity with LayoutNode.
   */
  public children(): LayoutNode[];
  public children(matching: (item: AnyItem) => boolean): LayoutNode | undefined;
  public children(matching?: (item: AnyItem) => boolean): any {
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
  public flat(includeGroups: true): LayoutNode[];
  public flat(includeGroups: false): LayoutNode<HComponent>[];
  public flat(includeGroups: boolean): LayoutNode[] {
    if (!includeGroups) {
      return this.allChildren.filter((c) => c.item.type !== 'Group');
    }

    return this.allChildren;
  }

  public findById(id: string, traversePages = true): LayoutNode | undefined {
    if (this.idMap[id] && this.idMap[id].length) {
      return this.allChildren[this.idMap[id][0]];
    }

    if (traversePages && this.top) {
      return this.top.collection.findById(id, this.top.myKey);
    }

    return undefined;
  }

  public findAllById(id: string, traversePages = true): LayoutNode[] {
    const out: LayoutNode[] = [];
    if (this.idMap[id] && this.idMap[id].length) {
      for (const idx of this.idMap[id]) {
        out.push(this.allChildren[idx]);
      }
    }

    if (traversePages && this.top) {
      for (const item of this.top.collection.findAllById(id, this.top.myKey)) {
        out.push(item);
      }
    }

    return out;
  }

  public registerCollection(myKey: string, collection: LayoutPages<any>) {
    this.top = {
      myKey,
      collection,
    };
  }
}

/**
 * A LayoutNode wraps a component with information about its parent, allowing you to traverse a component (or an
 * instance of a component inside a repeating group), finding other components near it.
 */
export class LayoutNode<Item extends AnyItem = AnyItem> implements LayoutObject {
  public constructor(
    public item: Item,
    public parent: ParentNode,
    public top: LayoutPage,
    private readonly dataSources: HierarchyDataSources,
    public readonly rowIndex?: number,
  ) {}

  /**
   * Looks for a matching component upwards in the hierarchy, returning the first one (or undefined if
   * none can be found).
   */
  public closest(matching: (item: AnyItem) => boolean): this | LayoutNode | undefined {
    if (matching(this.item)) {
      return this;
    }

    const sibling = this.parent.children(matching, this.rowIndex);
    if (sibling) {
      return sibling as LayoutNode;
    }

    return this.parent.closest(matching);
  }

  private recurseParents(callback: (node: ParentNode) => void) {
    callback(this.parent);
    if (!(this.parent instanceof LayoutPage)) {
      this.parent.recurseParents(callback);
    }
  }

  /**
   * Like children(), but will only match upwards along the tree towards the top (LayoutPage)
   */
  public parents(matching?: (item: ParentNode) => boolean): ParentNode[] {
    const parents: ParentNode[] = [];
    this.recurseParents((node) => parents.push(node));

    if (matching) {
      return parents.filter(matching);
    }

    return parents;
  }

  private childrenIdsAsList(onlyInRowIndex?: number) {
    let list: AnyItem[] = [];
    if (this.item.type === 'Group' && 'rows' in this.item) {
      if (typeof onlyInRowIndex === 'number') {
        list = this.item.rows.find((r) => r && r.index === onlyInRowIndex)?.items || [];
      } else {
        // Beware: In most cases this will just match the first row.
        list = Object.values(this.item.rows)
          .map((r) => r && r.items)
          .flat() as AnyItem[];
      }
    } else if (this.item.type === 'Group' && 'childComponents' in this.item) {
      list = this.item.childComponents;
    }

    return list.map((item) => item.id);
  }

  /**
   * Looks for a matching component inside the (direct) children of this node (only makes sense for a group node).
   * Beware that matching inside a repeating group with multiple rows, you should provide a second argument to specify
   * the row number, otherwise you'll most likely just find a component on the first row.
   */
  public children(): LayoutNode[];
  public children(matching: (item: AnyItem) => boolean, onlyInRowIndex?: number): LayoutNode | undefined;
  public children(matching: undefined, onlyInRowIndex?: number): LayoutNode[];
  public children(matching?: (item: AnyItem) => boolean, onlyInRowIndex?: number): any {
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
   * LayoutNode objects. Implemented here for parity with LayoutPage.
   *
   * @param includeGroups If true, also includes the group nodes (which also includes self, when this node is a group)
   * @param onlyInRowIndex If set, it will only include children with the given row index. It will still include all
   *        children of nested groups regardless of row-index.
   */
  public flat(includeGroups: true, onlyInRowIndex?: number): LayoutNode[];
  public flat(includeGroups: false, onlyInRowIndex?: number): LayoutNode<HComponent>[];
  public flat(includeGroups: boolean, onlyInRowIndex?: number): LayoutNode[] {
    const out: LayoutNode[] = [];
    const recurse = (item: LayoutNode, rowIndex?: number) => {
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
  public isHidden(respectLegacy = true): boolean {
    const hiddenList = respectLegacy ? this.dataSources.hiddenFields : new Set();

    if (this.item.baseComponentId && hiddenList.has(this.item.baseComponentId)) {
      return true;
    }

    if (this.item.hidden === true || hiddenList.has(this.item.id)) {
      return true;
    }

    if (this.parent.item.type === 'Group' && 'rows' in this.parent.item && typeof this.rowIndex === 'number') {
      const isHiddenRow = this.parent.item.rows[this.rowIndex]?.groupExpressions?.hiddenRow;
      if (isHiddenRow) {
        return true;
      }
    }

    return !!(this.parent instanceof LayoutNode && this.parent.isHidden(respectLegacy));
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

  /**
   * Returns all the current validations for this node. There will be different validations per binding.
   */
  public getValidations(binding: keyof IDataModelBindings | string): IComponentBindingValidation;
  public getValidations(binding?: undefined): IComponentValidations;
  public getValidations(binding?: string): IComponentBindingValidation | IComponentValidations {
    const pageKey = this.top.top.myKey;
    const page = this.dataSources.validations[pageKey] || {};
    const component = page[this.item.id] || {};

    if (binding) {
      return component[binding] || {};
    }

    return component;
  }

  /**
   * Returns all the current validations for this node, regardless of the data binding.
   */
  public getUnifiedValidations(): IComponentBindingValidation {
    const out: IComponentBindingValidation = {};
    const validations = this.getValidations();
    for (const bindingKey of Object.keys(validations)) {
      const binding = validations[bindingKey] || {};
      for (const type of Object.keys(binding) as (keyof IComponentBindingValidation)[]) {
        const messages = binding[type] || [];
        if (!messages.length) {
          continue;
        }
        if (type in out && Array.isArray(out[type])) {
          out[type]?.push(...messages);
        } else {
          out[type] = [...messages];
        }
      }
    }

    return out;
  }

  /**
   * Get specific validation messages (either unified, from all data model bindings, or from a specific one)
   */
  public getValidationMessages(type: ValidationKeyOrAny, bindingKey?: string): string[] {
    if (bindingKey) {
      const validations = this.getValidations();
      const binding = validations[bindingKey] || {};
      return this.typeFromValidations(binding, type);
    }

    const validations = this.getUnifiedValidations();
    return this.typeFromValidations(validations, type);
  }

  /**
   * Checks if there are any validation messages for a given type
   */
  public hasValidationMessages(type: ValidationKeyOrAny = 'errors'): boolean {
    return this.getValidationMessages(type).length > 0;
  }

  /**
   * Speciality function to check if the component (or possibly any of its child components) has validation any errors
   */
  public hasDeepValidationMessages(type: ValidationKeyOrAny = 'errors'): boolean {
    const thisHasMessages = this.hasValidationMessages(type);
    const childrenHasMessages =
      this.children()
        .map((n) => n.hasDeepValidationMessages(type))
        .find((b) => b) || false;

    return thisHasMessages || childrenHasMessages;
  }

  private typeFromValidations(validations: IComponentBindingValidation, type: ValidationKeyOrAny): string[] {
    if (type === 'any') {
      const out: string[] = [];
      for (const key of Object.keys(validations)) {
        out.push(...(validations[key] || []));
      }
      return out;
    }

    return validations[type] || [];
  }

  /**
   * Gets the LayoutComponent object, a toolbox for this specific component
   */
  public getComponent(): Item['type'] extends keyof ComponentClassMap
    ? ComponentClassMap[Item['type']]
    : LayoutComponent {
    return getLayoutComponentObject(this.item.type as any);
  }

  /**
   * Gets the current form data for this component
   */
  public getFormData(): IComponentFormData {
    if (!this.item.dataModelBindings) {
      return {};
    }

    const formDataObj: IComponentFormData = {};
    for (const key of Object.keys(this.item.dataModelBindings)) {
      const binding = this.item.dataModelBindings[key];
      if (this.dataSources.formData[binding]) {
        formDataObj[key] = this.dataSources.formData[binding];
      } else {
        formDataObj[key] = '';
      }
    }

    return formDataObj;
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
 */
function nodesInLayout(
  formLayout: ILayout | undefined | null,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
): LayoutPage {
  const root = new LayoutPage();

  const recurse = (
    // The typing here is a lie. We don't have resolved expressions yet, that will happen later.
    list: (ExprResolved<ILayoutComponent> | HNonRepGroup | HRepGroup | HRepGroupChild)[],
    parent: ParentNode,
    rowIndex?: number,
  ) => {
    for (const component of list) {
      if (component.type === 'Group' && 'rows' in component) {
        const group: ParentNode = new LayoutNode(component, parent, root, dataSources, rowIndex);
        component.rows.forEach((row) => row && recurse(row.items, group, row.index));
        root._addChild(group);
      } else if (component.type === 'Group' && 'childComponents' in component) {
        const group = new LayoutNode(component, parent, root, dataSources, rowIndex);
        recurse(component.childComponents, group);
        root._addChild(group);
      } else {
        const node = new LayoutNode(component as AnyItem, parent, root, dataSources, rowIndex);
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
 * The same as the function above, but takes multiple layouts and returns a collection
 */
function nodesInLayouts(
  layouts: ILayouts | undefined | null,
  currentView: string,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
): LayoutPages {
  const nodes = {};

  const _layouts = layouts || {};
  for (const key of Object.keys(_layouts)) {
    nodes[key] = nodesInLayout(_layouts[key], repeatingGroups, dataSources);
  }

  return new LayoutPages(currentView as keyof typeof nodes, nodes);
}

/**
 * This is the same tool as the one above, but additionally it will iterate each component/group in the layout
 * and resolve all expressions for it.
 *
 * @deprecated Do not use directly. Use ExprContext instead, as it provides
 *   resolved layouts. In sagas, use ResolvedNodesSelector
 */
export function resolvedNodesInLayouts(
  layouts: ILayouts | null,
  currentLayout: string,
  repeatingGroups: IRepeatingGroups | null,
  dataSources: HierarchyDataSources,
) {
  // A full copy is needed here because formLayout comes from the redux store, and in production code (not the
  // development server!) the properties are not mutable (but we have to mutate them below).
  const layoutsCopy: ILayouts = JSON.parse(JSON.stringify(layouts || {}));
  const unresolved = nodesInLayouts(layoutsCopy, currentLayout, repeatingGroups, dataSources);

  const config = {
    ...ExprConfigForComponent,
    ...ExprConfigForGroup,
  } as any;

  for (const layout of Object.values(unresolved.all())) {
    for (const node of layout.flat(true)) {
      const input = { ...node.item };
      delete input['children'];
      delete input['rows'];
      delete input['childComponents'];

      const resolvedItem = evalExprInObj({
        input,
        node,
        dataSources,
        config,
        resolvingPerRow: false,
      }) as unknown as AnyItem;

      if (node.item.type === 'Group' && 'rows' in node.item) {
        for (const row of node.item.rows) {
          if (!row) {
            continue;
          }
          const firstItem = row.items[0];
          if (!firstItem) {
            continue;
          }
          const firstItemNode = unresolved.findById(firstItem.id);
          if (firstItemNode) {
            row.groupExpressions = evalExprInObj({
              input,
              node: firstItemNode,
              dataSources,
              config,
              resolvingPerRow: true,
              deleteNonExpressions: true,
            }) as any;
          }
        }
      }

      for (const key of Object.keys(resolvedItem)) {
        // Mutates node.item directly - this also mutates references to it and makes sure
        // we resolve expressions deep inside recursive structures.
        node.item[key] = resolvedItem[key];
      }
    }
  }

  return unresolved as unknown as LayoutPages;
}

/**
 * This updates the textResourceBindings for each node to match the new one made in replaceTextResourcesSaga.
 * It must be run _after_ resolving expressions, as that may decide to use other text resource bindings.
 *
 * @see replaceTextResourcesSaga
 * @see replaceTextResourceParams
 * @ßee getVariableTextKeysForRepeatingGroupComponent
 */
export function rewriteTextResourceBindings(collection: LayoutPages, textResources: ITextResource[]) {
  for (const layout of Object.values(collection.all())) {
    for (const node of layout.flat(true)) {
      if (!node.item.textResourceBindings || node.rowIndex === undefined) {
        continue;
      }

      if (node.parent instanceof LayoutPage || !(node.parent.parent instanceof LayoutPage)) {
        // This only works in row items on the first level (not for nested repeating groups)
        continue;
      }

      const rewrittenItems = { ...node.item.textResourceBindings };
      if (textResources && node.item.textResourceBindings) {
        const bindingsWithVariablesForRepeatingGroups = Object.keys(rewrittenItems).filter((key) => {
          const textKey = rewrittenItems[key];
          const textResource = textResources.find((text) => text.id === textKey);
          return (
            textResource && textResource.variables && textResource.variables.find((v) => v.key.indexOf('[{0}]') > -1)
          );
        });

        bindingsWithVariablesForRepeatingGroups.forEach((key) => {
          rewrittenItems[key] = `${rewrittenItems[key]}-${node.rowIndex}`;
        });
      }

      node.item.textResourceBindings = { ...rewrittenItems };
    }
  }
}

/**
 * A tool when you have more than one LayoutPage (i.e. a full layout set). It can help you look up components
 * by ID, and if you have colliding component IDs in multiple layouts it will prefer the one in the current layout.
 */
export class LayoutPages<
  Collection extends { [layoutKey: string]: LayoutPage } = {
    [layoutKey: string]: LayoutPage;
  },
> {
  private readonly objects: Collection;

  public constructor(private currentView?: keyof Collection, objects?: Collection) {
    this.objects = objects || ({} as any);
    for (const layoutKey of Object.keys(this.objects)) {
      const layout = this.objects[layoutKey];
      layout.registerCollection(layoutKey, this);
    }
  }

  public findById(id: string, exceptInPage?: string): LayoutNode | undefined {
    const current = this.current();
    if (current && this.currentView !== exceptInPage) {
      const inCurrent = this.current()?.findById(id, false);
      if (inCurrent) {
        return inCurrent;
      }
    }

    for (const otherLayoutKey of Object.keys(this.objects)) {
      if (otherLayoutKey === this.currentView || otherLayoutKey === exceptInPage) {
        continue;
      }
      const inOther = this.objects[otherLayoutKey].findById(id, false);
      if (inOther) {
        return inOther;
      }
    }

    return undefined;
  }

  public findAllById(id: string, exceptInPage?: string): LayoutNode[] {
    const out: LayoutNode[] = [];

    for (const key of Object.keys(this.objects)) {
      if (key !== exceptInPage) {
        out.push(...this.objects[key].findAllById(id, false));
      }
    }

    return out;
  }

  public findLayout(key: keyof Collection | string | undefined): LayoutPage | undefined {
    if (!key) {
      return undefined;
    }
    return this.objects[key];
  }

  public current(): LayoutPage | undefined {
    if (!this.currentView) {
      return undefined;
    }

    const current = this.findLayout(this.currentView);
    if (current) {
      return current;
    }

    const layouts = Object.keys(this.objects);
    if (layouts.length) {
      return this.objects[layouts[0]];
    }

    return undefined;
  }

  public all(): Collection {
    return this.objects;
  }

  public flat<L extends keyof Collection>(exceptLayout?: L) {
    return [
      ...Object.keys(this.objects)
        .filter((key) => key !== exceptLayout)
        .map((key) => this.objects[key])
        .flat(),
    ] as $Values<Omit<Collection, L>>[];
  }
}

export function dataSourcesFromState(state: IRuntimeState): HierarchyDataSources {
  return {
    formData: state.formData.formData,
    applicationSettings: state.applicationSettings.applicationSettings,
    instanceContext: buildInstanceContext(state.instanceData?.instance),
    hiddenFields: new Set(state.formLayout.uiConfig.hiddenFields),
    validations: state.formValidations.validations,
  };
}

export function resolvedLayoutsFromState(state: IRuntimeState): LayoutPages {
  const resolved = resolvedNodesInLayouts(
    state.formLayout.layouts,
    state.formLayout.uiConfig.currentView,
    state.formLayout.uiConfig.repeatingGroups,
    dataSourcesFromState(state),
  );
  rewriteTextResourceBindings(resolved, state.textResources.resources);

  return resolved;
}

/**
 * Selector for use in redux sagas. Will return a fully resolved layouts tree.
 * Specify manually that the returned value from this is `LayoutPages`
 */
export const ResolvedNodesSelector = (state: IRuntimeState) => resolvedLayoutsFromState(state);

/**
 * Exported only for testing. Please do not use!
 */
export const _private = {
  layoutAsHierarchy,
  layoutAsHierarchyWithRows,
  nodesInLayout,
  nodesInLayouts,
};

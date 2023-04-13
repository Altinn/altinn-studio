import { getLayoutComponentObject } from 'src/layout';
import { DataBinding } from 'src/utils/databindings/DataBinding';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { ComponentClassMap } from 'src/layout';
import type { ComponentTypes, IDataModelBindings } from 'src/layout/layout';
import type { ComponentType } from 'src/layout/LayoutComponent';
import type { IComponentBindingValidation, IComponentValidations, ValidationKeyOrAny } from 'src/types';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type {
  AnyItem,
  HComponent,
  HierarchyDataSources,
  HNonRepGroup,
  HRepGroup,
  LayoutNodeFromComponentType,
  LayoutNodeFromType,
  ParentNode,
  TypeFromAnyItem,
} from 'src/utils/layout/hierarchy.types';
import type { LayoutObject } from 'src/utils/layout/LayoutObject';

/**
 * A LayoutNode wraps a component with information about its parent, allowing you to traverse a component (or an
 * instance of a component inside a repeating group), finding other components near it.
 */
export class LayoutNode<Item extends AnyItem = AnyItem, Type extends ComponentTypes = TypeFromAnyItem<Item>>
  implements LayoutObject
{
  public readonly def: ComponentClassMap[Type];

  public constructor(
    public item: Item,
    public parent: ParentNode,
    public top: LayoutPage,
    private readonly dataSources: HierarchyDataSources,
    public readonly rowIndex?: number,
  ) {
    this.def = getLayoutComponentObject(item.type as any);
  }

  public isType<T extends ComponentTypes>(type: T): this is LayoutNodeFromType<T> {
    return this.item.type === type;
  }

  public isComponentType<T extends ComponentType>(type: T): this is LayoutNodeFromComponentType<T> {
    return this.def.type === type;
  }

  public isRepGroup(): this is LayoutNode<HRepGroup, 'Group'> {
    return this.item.type === 'Group' && typeof this.item.maxCount === 'number' && this.item.maxCount > 1;
  }

  public isNonRepGroup(): this is LayoutNode<HNonRepGroup, 'Group'> {
    return this.item.type === 'Group' && (!this.item.maxCount || this.item.maxCount <= 1);
  }

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

  private childrenAsList(onlyInRowIndex?: number): LayoutNode[] {
    let list: LayoutNode[] = [];
    if (this.isRepGroup()) {
      const maybeNodes =
        typeof onlyInRowIndex === 'number'
          ? this.item.rows.find((r) => r && r.index === onlyInRowIndex)?.items || []
          : // Beware: In most cases this will just match the first row.
            Object.values(this.item.rows)
              .map((r) => r?.items)
              .flat();

      for (const node of maybeNodes) {
        if (node) {
          list.push(node);
        }
      }
    } else if (this.isNonRepGroup()) {
      list = this.item.childComponents;
    }

    return list;
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
    const list = this.childrenAsList(onlyInRowIndex);
    if (!matching) {
      return list;
    }

    for (const node of list) {
      if (matching(node.item)) {
        return node;
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

      const arrayIndex = ours.parentIndex === lastIdx && this.isRepGroup() ? rowIndex : ours.arrayIndex;

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

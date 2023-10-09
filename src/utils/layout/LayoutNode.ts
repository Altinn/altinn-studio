import { getLayoutComponentObject } from 'src/layout';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { runValidationOnNodes } from 'src/utils/validation/validation';
import type { CompClassMap } from 'src/layout';
import type { CompCategory } from 'src/layout/common';
import type { ComponentTypeConfigs } from 'src/layout/components.generated';
import type {
  CompExceptGroup,
  CompInternal,
  CompTypes,
  HierarchyDataSources,
  LayoutNodeFromCategory,
  ParentNode,
  TypeFromConfig,
} from 'src/layout/layout';
import type { IComponentFormData } from 'src/utils/formComponentUtils';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutObject } from 'src/utils/layout/LayoutObject';
import type {
  IComponentBindingValidation,
  IComponentValidations,
  IValidationObject,
  ValidationContextGenerator,
  ValidationKeyOrAny,
} from 'src/utils/validation/types';
import type { IValidationOptions } from 'src/utils/validation/validation';

export interface IsHiddenOptions {
  respectLegacy?: boolean;
  respectDevTools?: boolean;
  respectTracks?: boolean;
}

/**
 * A LayoutNode wraps a component with information about its parent, allowing you to traverse a component (or an
 * instance of a component inside a repeating group), finding other components near it.
 */
export class BaseLayoutNode<Item extends CompInternal = CompInternal, Type extends CompTypes = TypeFromConfig<Item>>
  implements LayoutObject
{
  public readonly itemWithExpressions: Item;
  public readonly def: CompClassMap[Type];

  public constructor(
    public item: Item,
    public parent: ParentNode,
    public top: LayoutPage,
    private readonly dataSources: HierarchyDataSources,
    public readonly rowIndex?: number,
  ) {
    this.def = getLayoutComponentObject(item.type as any);
    this.itemWithExpressions = structuredClone(item);
  }

  public isType<T extends CompTypes>(type: T): this is LayoutNode<T> {
    return this.item.type === type;
  }

  public isCategory<T extends CompCategory>(category: T): this is LayoutNodeFromCategory<T> {
    return this.def.type === category;
  }

  public pageKey(): string {
    return this.top.top.myKey;
  }

  /**
   * Looks for a matching component upwards in the hierarchy, returning the first one (or undefined if
   * none can be found).
   */
  public closest(matching: (item: CompInternal) => boolean): this | LayoutNode | undefined {
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
    const hierarchy = this.def.hierarchyGenerator() as unknown as ComponentHierarchyGenerator<Type>;
    return hierarchy.childrenFromNode(this as unknown as LayoutNode<Type>, onlyInRowIndex);
  }

  /**
   * Looks for a matching component inside the (direct) children of this node (only makes sense for a group node).
   * Beware that matching inside a repeating group with multiple rows, you should provide a second argument to specify
   * the row number, otherwise you'll most likely just find a component on the first row.
   */
  public children(): LayoutNode[];
  public children(matching: (item: CompInternal) => boolean, onlyInRowIndex?: number): LayoutNode | undefined;
  public children(matching: undefined, onlyInRowIndex?: number): LayoutNode[];
  public children(matching?: (item: CompInternal) => boolean, onlyInRowIndex?: number): any {
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
  public flat(includeGroups: false, onlyInRowIndex?: number): LayoutNode<CompExceptGroup>[];
  public flat(includeGroups: boolean, onlyInRowIndex?: number): LayoutNode[] {
    const out: BaseLayoutNode[] = [];
    const recurse = (item: BaseLayoutNode, rowIndex?: number) => {
      if (includeGroups || item.item.type !== 'Group') {
        out.push(item);
      }
      for (const child of item.children(undefined, rowIndex)) {
        recurse(child);
      }
    };

    recurse(this, onlyInRowIndex);
    return out as LayoutNode[];
  }

  /**
   * Checks if this field should be hidden. This also takes into account the group this component is in, so the
   * methods returns true if the component is inside a hidden group.
   */
  public isHidden(options: IsHiddenOptions = {}): boolean {
    const { respectLegacy = true, respectDevTools = true, respectTracks = false } = options;

    const hiddenList = respectLegacy ? this.dataSources.hiddenFields : new Set();
    if (respectDevTools && this.dataSources.devTools.isOpen && this.dataSources.devTools.hiddenComponents !== 'hide') {
      return false;
    }

    if (this.item.baseComponentId && hiddenList.has(this.item.baseComponentId)) {
      return true;
    }

    if (this.item.hidden === true || hiddenList.has(this.item.id)) {
      return true;
    }

    if (
      this.parent instanceof BaseLayoutNode &&
      this.parent.isType('Group') &&
      this.parent.isRepGroup() &&
      typeof this.rowIndex === 'number'
    ) {
      const isHiddenRow = this.parent.item.rows[this.rowIndex]?.groupExpressions?.hiddenRow;
      if (isHiddenRow) {
        return true;
      }

      const myBaseId = this.item.baseComponentId || this.item.id;
      const groupMode = this.parent.item.edit?.mode;
      const tableColSetup = this.parent.item.tableColumns && this.parent.item.tableColumns[myBaseId];

      // This specific configuration hides the component fully, without having set hidden=true on the component itself.
      // It's most likely done by mistake, but we still need to respect it when checking if the component is hidden,
      // because it doesn't make sense to validate a component that is hidden in the UI and the
      // user cannot interact with.
      let hiddenImplicitly =
        tableColSetup?.showInExpandedEdit === false && !tableColSetup?.editInTable && groupMode !== 'onlyTable';

      if (groupMode === 'onlyTable' && tableColSetup?.editInTable === false) {
        // This is also a way to hide a component implicitly
        hiddenImplicitly = true;
      }

      if (hiddenImplicitly) {
        return true;
      }
    }

    if (
      respectTracks &&
      this.parent instanceof LayoutPage &&
      this.parent.isHiddenViaTracks(this.dataSources.uiConfig)
    ) {
      return true;
    }

    return this.parent instanceof BaseLayoutNode && this.parent.isHidden(options);
  }

  private firstDataModelBinding() {
    const firstBinding = Object.keys(this.item.dataModelBindings || {}).shift();
    if (firstBinding && 'dataModelBindings' in this.item && this.item.dataModelBindings) {
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
      if (this.parent instanceof BaseLayoutNode) {
        return this.parent.transposeDataModel(dataModel, this.rowIndex);
      }

      return dataModel;
    }

    const currentLocationIsRepGroup = this.isType('Group') && this.isRepGroup();
    return transposeDataBinding({
      subject: dataModel,
      currentLocation: firstBinding,
      rowIndex,
      currentLocationIsRepGroup,
    });
  }

  /**
   * Returns all the current validations for this node. There will be different validations per binding.
   */
  public getValidations(binding: string): IComponentBindingValidation;
  public getValidations(binding?: undefined): IComponentValidations;
  public getValidations(binding?: string): IComponentBindingValidation | IComponentValidations {
    const pageKey = this.pageKey();
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
    if (!('dataModelBindings' in this.item) || !this.item.dataModelBindings) {
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

  public getRowIndices(): number[] {
    const rowIndices: number[] = [];
    if (typeof this.rowIndex !== 'undefined') {
      rowIndices.splice(0, 0, this.rowIndex);
    }
    if (this.parent instanceof BaseLayoutNode) {
      const parentIndices = this.parent.getRowIndices();
      if (parentIndices) {
        rowIndices.splice(0, 0, ...parentIndices);
      }
    }
    return rowIndices;
  }

  public getDataSources(): HierarchyDataSources {
    return this.dataSources;
  }

  /**
   * Runs frontend validations for this node and returns an array of IValidationObject
   */
  runValidations(
    validationCtxGenerator: ValidationContextGenerator,
    options?: IValidationOptions,
  ): IValidationObject[] {
    return runValidationOnNodes([this as LayoutNode], validationCtxGenerator, options);
  }
}

export type LayoutNode<Type extends CompTypes = CompTypes> = Type extends CompTypes
  ? ComponentTypeConfigs[Type]['nodeObj']
  : BaseLayoutNode;

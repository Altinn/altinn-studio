import dot from 'dot-object';

import { getLayoutComponentObject } from 'src/layout';
import { convertDataBindingToModel } from 'src/utils/databindings';
import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
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
    if (respectDevTools && this.dataSources.devToolsIsOpen && this.dataSources.devToolsHiddenComponents !== 'hide') {
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
      this.parent.isType('RepeatingGroup') &&
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
      this.parent.isHiddenViaTracks(this.dataSources.layoutSettings, this.dataSources.pageNavigationConfig)
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
  public transposeDataModel(dataModelPath: string, rowIndex?: number): string {
    const firstBinding = this.firstDataModelBinding();
    if (!firstBinding) {
      if (this.parent instanceof BaseLayoutNode) {
        return this.parent.transposeDataModel(dataModelPath, this.rowIndex);
      }

      return dataModelPath;
    }

    const currentLocationIsRepGroup = this.isType('RepeatingGroup');
    return transposeDataBinding({
      subject: dataModelPath,
      currentLocation: firstBinding,
      rowIndex,
      currentLocationIsRepGroup,
    });
  }

  /**
   * Gets the current form data for this component
   */
  public getFormData(): IComponentFormData<Type> {
    if (!('dataModelBindings' in this.item) || !this.item.dataModelBindings) {
      return {} as IComponentFormData<Type>;
    }

    const fullFormData = convertDataBindingToModel(this.dataSources.formData);
    const formDataObj: { [key: string]: any } = {};
    for (const key of Object.keys(this.item.dataModelBindings)) {
      const binding = this.item.dataModelBindings[key];
      const data = dot.pick(binding, fullFormData);

      if (key === 'list') {
        formDataObj[key] = data ?? [];
      } else if (key === 'simpleBinding') {
        formDataObj[key] = data ? String(data) : '';
      } else {
        formDataObj[key] = data;
      }
    }

    return formDataObj as IComponentFormData<Type>;
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
}

export type LayoutNode<Type extends CompTypes = CompTypes> = Type extends CompTypes
  ? ComponentTypeConfigs[Type]['nodeObj']
  : BaseLayoutNode;

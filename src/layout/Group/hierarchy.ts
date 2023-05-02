import { GridHierarchyGenerator } from 'src/layout/Grid/hierarchy';
import { getRepeatingGroupStartStopIndex } from 'src/utils/formLayout';
import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { HRepGroupChild, HRepGroupRow } from 'src/utils/layout/hierarchy.types';
import type {
  ChildFactory,
  ChildFactoryProps,
  ChildMutator,
  HierarchyContext,
  HierarchyGenerator,
  UnprocessedItem,
} from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface GroupPanelRef {
  childPage: string;
  multiPage: boolean | undefined;
  children: string[];
  parentPage: string;
  parentId: string;
  nextChildren?: LayoutNode<HRepGroupChild>[];
}

export class GroupHierarchyGenerator extends ComponentHierarchyGenerator<'Group'> {
  private groupPanelRefs: { [key: string]: GroupPanelRef } = {};
  private innerGrid: GridHierarchyGenerator;

  constructor(generator: HierarchyGenerator) {
    super(generator);
    this.innerGrid = new GridHierarchyGenerator(generator);
  }

  stage1(item: UnprocessedItem<'Group'>): void {
    for (const id of item.children) {
      const [, childId] = item.edit?.multiPage ? id.split(':', 2) : [undefined, id];
      this.generator.claimChild({ childId, parentId: item.id });
    }

    if (item.panel?.groupReference?.group) {
      const groupId = item.panel.groupReference.group;
      const groupPrototype = this.generator.prototype(groupId) as UnprocessedItem<'Group'>;
      if (!groupPrototype) {
        console.warn(`Group ${groupId} referenced by panel ${item.id} does not exist`);
        return;
      }

      this.groupPanelRefs[groupId] = {
        childPage: this.generator.topKey,
        multiPage: item.edit?.multiPage,
        children: item.children,
        parentPage: this.generator.topKey,
        parentId: item.id,
      };
    }

    for (const rows of [item.rowsBefore, item.rowsAfter]) {
      if (rows) {
        this.innerGrid.stage1({
          id: item.id,
          rows,
        });
      }
    }
  }

  stage2(ctx: HierarchyContext): ChildFactory<'Group'> {
    const item = this.generator.prototype(ctx.id) as UnprocessedItem<'Group'>;
    if (item.panel?.groupReference) {
      return this.processPanelReference(ctx);
    }

    const isRepeating = item.maxCount && item.maxCount > 1;
    if (isRepeating) {
      return this.processRepeating(ctx);
    }
    return this.processNonRepeating(ctx);
  }

  /**
   * Process a group that references another (repeating) group. It should have its own children, but those children
   * will be resolved as references inside a simulated next-row of the referenced repeating group.
   *
   * TODO: This code requires that panel references are defined after the group they reference. The panel references
   * should ideally resolve their children in a third stage, after all groups have been processed, but that would
   * require a more complex implementation of the HierarchyGenerator.
   */
  private processPanelReference(_ctx: HierarchyContext): ChildFactory<'Group'> {
    return (props) => {
      delete (props.item as any)['children'];
      const me = this.generator.makeNode(props);
      const groupId = props.item.panel?.groupReference?.group;
      if (!groupId) {
        throw new Error(`Group ${props.item.id} is a panel reference but does not reference a group`);
      }

      this.generator.addStage3Callback(() => {
        const ref = this.groupPanelRefs[groupId];
        if (!ref) {
          throw new Error(
            `Group panel ${props.item.id} references group ${groupId} which does not have a reference entry`,
          );
        }

        if (!ref.nextChildren) {
          throw new Error(
            `Group panel ${props.item.id} references group ${groupId} which did not generate nextChildren`,
          );
        }

        if (me.isNonRepGroup()) {
          me.item.childComponents = ref.nextChildren;
        }
      });

      return me;
    };
  }

  /**
   * Process non-repeating group. These are fairly simple, and just copy create regular LayoutNode objects for its
   * children.
   */
  private processNonRepeating(ctx: HierarchyContext): ChildFactory<'Group'> {
    return (props) => {
      const prototype = this.generator.prototype(ctx.id) as UnprocessedItem<'Group'>;

      delete (props.item as any)['children'];
      const me = this.generator.makeNode(props);

      const childNodes: LayoutNode[] = [];
      for (const id of prototype.children) {
        const [, childId] = me.item.edit?.multiPage ? id.split(':', 2) : [undefined, id];
        const child = this.generator.newChild({
          ctx,
          parent: me,
          childId,
        });
        child && childNodes.push(child);
      }

      if (me.isNonRepGroup()) {
        me.item.childComponents = childNodes;
      }

      return me;
    };
  }

  /**
   * Repeating groups are more complex, as they need to rewrite data model bindings, mapping, etc in their children.
   * Also, child components are repeated for each row (row = each group in the repeating structure).
   */
  private processRepeating(ctx: HierarchyContext): ChildFactory<'Group'> {
    return (props) => {
      const prototype = this.generator.prototype(ctx.id) as UnprocessedItem<'Group'>;

      delete (props.item as any)['children'];
      const me = this.generator.makeNode(props);

      const rows: HRepGroupRow[] = [];
      const lastIndex = (this.generator.repeatingGroups || {})[props.item.id]?.index;
      const { startIndex, stopIndex } = getRepeatingGroupStartStopIndex(lastIndex, props.item.edit);

      for (let rowIndex = startIndex; rowIndex <= stopIndex; rowIndex++) {
        const rowChildren: LayoutNode<HRepGroupChild>[] = [];

        for (const id of prototype.children) {
          const [multiPageIndex, childId] = props.item.edit?.multiPage ? id.split(':', 2) : [undefined, id];
          const child = this.generator.newChild({
            ctx,
            childId,
            parent: me,
            rowIndex,
            directMutators: [addMultiPageIndex(multiPageIndex)],
            recursiveMutators: [
              mutateComponentId(rowIndex),
              mutateDataModelBindings(props, rowIndex),
              mutateMapping(ctx, rowIndex),
            ],
          });
          child && rowChildren.push(child);
        }

        rows.push({
          index: rowIndex,
          items: rowChildren,
        });
      }

      if (this.groupPanelRefs[props.item.id]) {
        const ref = this.groupPanelRefs[props.item.id];
        const nextIndex = lastIndex + 1;
        const nextChildren: LayoutNode<HRepGroupChild>[] = [];

        for (const id of ref.children) {
          const [multiPageIndex, childId] = ref.multiPage ? id.split(':', 2) : [undefined, id];
          const child = this.generator.newChild({
            ctx,
            childPage: ref.childPage,
            childId,
            parentPage: ref.parentPage,
            parent: me,
            overrideParentId: ref.parentId,
            rowIndex: nextIndex,
            directMutators: [addMultiPageIndex(multiPageIndex)],
            recursiveMutators: [
              mutateComponentId(nextIndex),
              mutateDataModelBindings(props, nextIndex),
              mutateMapping(ctx, nextIndex),
            ],
          });
          child && nextChildren.push(child);
        }

        ref.nextChildren = nextChildren;
      }

      for (const gridRows of [me.item.rowsBefore, me.item.rowsAfter]) {
        if (gridRows) {
          this.innerGrid.stage2Rows(ctx, me, gridRows);
        }
      }

      if (me.isRepGroup()) {
        me.item.rows = rows;
      }

      return me;
    };
  }
}

const addMultiPageIndex: (multiPageIndex: string | undefined) => ChildMutator = (multiPageIndex) => (item) => {
  if (multiPageIndex !== undefined) {
    item['multiPageIndex'] = parseInt(multiPageIndex);
  }
};

const mutateComponentId: (rowIndex: number) => ChildMutator = (rowIndex) => (item) => {
  item.baseComponentId = item.baseComponentId || item.id;
  item.id += `-${rowIndex}`;
};

const mutateDataModelBindings: (props: ChildFactoryProps<'Group'>, rowIndex: number) => ChildMutator =
  (props, rowIndex) => (item) => {
    const groupBinding = props.item.dataModelBindings?.group;
    const bindings = item.dataModelBindings || {};
    for (const key of Object.keys(bindings)) {
      if (groupBinding && bindings[key]) {
        bindings[key] = bindings[key].replace(groupBinding, `${groupBinding}[${rowIndex}]`);
      }
    }
  };

const mutateMapping: (ctx: HierarchyContext, rowIndex: number) => ChildMutator = (ctx, rowIndex) => (item) => {
  if ('mapping' in item && item.mapping) {
    const depthMarker = ctx.depth - 1;
    for (const key of Object.keys(item.mapping)) {
      const value = item.mapping[key];
      const newKey = key.replace(`[{${depthMarker}}]`, `[${rowIndex}]`);
      delete item.mapping[key];
      item.mapping[newKey] = value;
    }
  }
};

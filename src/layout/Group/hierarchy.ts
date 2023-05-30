import { GridHierarchyGenerator } from 'src/layout/Grid/hierarchy';
import { nodesFromGridRow } from 'src/layout/Grid/tools';
import { getRepeatingGroupStartStopIndex } from 'src/utils/formLayout';
import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { HRepGroupChild, HRepGroupRow } from 'src/layout/Group/types';
import type { ITextResource } from 'src/types';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type {
  ChildFactory,
  ChildFactoryProps,
  ChildMutator,
  HierarchyContext,
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

  constructor() {
    super();
    this.innerGrid = new GridHierarchyGenerator();
  }

  stage1(generator, item): void {
    for (const id of item.children) {
      const [, childId] = item.edit?.multiPage ? id.split(':', 2) : [undefined, id];
      generator.claimChild({ childId, parentId: item.id });
    }

    if (item.panel?.groupReference?.group) {
      const groupId = item.panel.groupReference.group;
      const groupPrototype = generator.prototype(groupId) as UnprocessedItem<'Group'>;
      if (!groupPrototype) {
        console.warn(`Group ${groupId} referenced by panel ${item.id} does not exist`);
        return;
      }

      this.groupPanelRefs[groupId] = {
        childPage: generator.topKey,
        multiPage: item.edit?.multiPage,
        children: item.children,
        parentPage: generator.topKey,
        parentId: item.id,
      };
    }

    for (const rows of [item.rowsBefore, item.rowsAfter]) {
      if (rows) {
        this.innerGrid.stage1(generator, {
          id: item.id,
          rows,
        });
      }
    }
  }

  stage2(ctx: HierarchyContext): ChildFactory<'Group'> {
    const item = ctx.generator.prototype(ctx.id) as UnprocessedItem<'Group'>;
    if (item.panel?.groupReference) {
      return this.processPanelReference(ctx);
    }

    const isRepeating = item.maxCount && item.maxCount > 1;
    if (isRepeating) {
      return this.processRepeating(ctx);
    }
    return this.processNonRepeating(ctx);
  }

  childrenFromNode(node: LayoutNodeFromType<'Group'>, onlyInRowIndex?: number): LayoutNode[] {
    let list: LayoutNode[] = [];
    if (node.isRepGroup()) {
      if (node.item.rowsBefore && onlyInRowIndex === undefined) {
        list.push(...node.item.rowsBefore.map(nodesFromGridRow).flat());
      }

      const maybeNodes =
        typeof onlyInRowIndex === 'number'
          ? node.item.rows.find((r) => r && r.index === onlyInRowIndex)?.items || []
          : // Beware: In most cases this will just match the first row.
            Object.values(node.item.rows)
              .map((r) => r?.items)
              .flat();

      for (const node of maybeNodes) {
        if (node) {
          list.push(node);
        }
      }

      if (node.item.rowsAfter && onlyInRowIndex === undefined) {
        list.push(...node.item.rowsAfter.map(nodesFromGridRow).flat());
      }
    } else if (node.isNonRepGroup()) {
      list = node.item.childComponents;
    }

    return list;
  }

  rewriteTextBindings(node: LayoutNodeFromType<'Group'>, textResources: ITextResource[]) {
    super.rewriteTextBindings(node, textResources);
    if (node.item?.rowsBefore) {
      this.innerGrid.rewriteTextBindingsForRows(node, node.item.rowsBefore, textResources);
    }
    if (node.item?.rowsAfter) {
      this.innerGrid.rewriteTextBindingsForRows(node, node.item.rowsAfter, textResources);
    }
  }

  /**
   * Process a group that references another (repeating) group. It should have its own children, but those children
   * will be resolved as references inside a simulated next-row of the referenced repeating group.
   */
  private processPanelReference(ctx: HierarchyContext): ChildFactory<'Group'> {
    return (props) => {
      delete (props.item as any)['children'];
      const me = ctx.generator.makeNode(props);
      const groupId = props.item.panel?.groupReference?.group;
      if (!groupId) {
        throw new Error(`Group ${props.item.id} is a panel reference but does not reference a group`);
      }

      ctx.generator.addStage3Callback(() => {
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
      const prototype = ctx.generator.prototype(ctx.id) as UnprocessedItem<'Group'>;

      delete (props.item as any)['children'];
      const me = ctx.generator.makeNode(props);

      const childNodes: LayoutNode[] = [];
      for (const id of prototype.children) {
        const [, childId] = me.item.edit?.multiPage ? id.split(':', 2) : [undefined, id];
        const child = ctx.generator.newChild({
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
      const prototype = ctx.generator.prototype(ctx.id) as UnprocessedItem<'Group'>;

      delete (props.item as any)['children'];
      const me = ctx.generator.makeNode(props);

      const rows: HRepGroupRow[] = [];
      const lastIndex = (ctx.generator.repeatingGroups || {})[props.item.id]?.index;
      const { startIndex, stopIndex } = getRepeatingGroupStartStopIndex(lastIndex, props.item.edit);

      for (let rowIndex = startIndex; rowIndex <= stopIndex; rowIndex++) {
        const rowChildren: LayoutNode<HRepGroupChild>[] = [];

        for (const id of prototype.children) {
          const [multiPageIndex, childId] = props.item.edit?.multiPage ? id.split(':', 2) : [undefined, id];
          const child = ctx.generator.newChild({
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
          const child = ctx.generator.newChild({
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

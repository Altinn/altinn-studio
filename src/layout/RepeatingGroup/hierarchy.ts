import { MissingRowIdException } from 'src/features/formData/MissingRowIdException';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { GridHierarchyGenerator } from 'src/layout/Grid/hierarchy';
import { nodesFromGridRow } from 'src/layout/Grid/tools';
import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { CompRepeatingGroupExternal, HRepGroupRows } from 'src/layout/RepeatingGroup/config.generated';
import type {
  ChildFactory,
  ChildFactoryProps,
  ChildLookupRestriction,
  ChildMutator,
  HierarchyContext,
  HierarchyGenerator,
  UnprocessedItem,
} from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class GroupHierarchyGenerator extends ComponentHierarchyGenerator<'RepeatingGroup'> {
  private innerGrid: GridHierarchyGenerator;

  constructor() {
    super();
    this.innerGrid = new GridHierarchyGenerator();
  }

  stage1(generator: HierarchyGenerator, item: UnprocessedItem<'RepeatingGroup'>): void {
    for (const id of item.children) {
      const [, childId] = item.edit?.multiPage ? id.split(':', 2) : [undefined, id];
      generator.claimChild({ childId, parentId: item.id });
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

  stage2(ctx: HierarchyContext): ChildFactory<'RepeatingGroup'> {
    return this.processRepeating(ctx);
  }

  childrenFromNode(node: LayoutNode<'RepeatingGroup'>, restriction?: ChildLookupRestriction): LayoutNode[] {
    const list: LayoutNode[] = [];

    if (node.item.rowsBefore && restriction === undefined) {
      list.push(...node.item.rowsBefore.map(nodesFromGridRow).flat());
    }

    const maybeNodes =
      restriction && 'onlyInRowUuid' in restriction
        ? node.item.rows.find((r) => r && r.uuid === restriction.onlyInRowUuid)?.items || []
        : restriction && 'onlyInRowIndex' in restriction
          ? node.item.rows.find((r) => r && r.index === restriction.onlyInRowIndex)?.items || []
          : // Beware: In most cases this will just match the first row.
            Object.values(node.item.rows)
              .map((r) => r?.items)
              .flat();

    for (const node of maybeNodes) {
      if (node) {
        list.push(node);
      }
    }

    if (node.item.rowsAfter && restriction === undefined) {
      list.push(...node.item.rowsAfter.map(nodesFromGridRow).flat());
    }

    return list;
  }

  /**
   * Repeating groups are more complex, as they need to rewrite data model bindings, mapping, etc in their children.
   * Also, child components are repeated for each row (row = each group in the repeating structure).
   */
  private processRepeating(ctx: HierarchyContext): ChildFactory<'RepeatingGroup'> {
    return (props) => {
      const prototype = ctx.generator.prototype(ctx.id) as UnprocessedItem<'RepeatingGroup'>;

      delete (props.item as any)['children'];
      const item = props.item as CompRepeatingGroupExternal;
      const me = ctx.generator.makeNode(props);
      const rows: HRepGroupRows = [];

      // Only fetch the row ID (and by extension the number of rows) so that we only re-generate the hierarchy
      // when the number for rows and/or the row IDs change, not the other data within it.
      const formData = item.dataModelBindings?.group
        ? ctx.generator.dataSources.formDataSelector(item.dataModelBindings.group, (rows) =>
            Array.isArray(rows) ? rows.map((row) => ({ [ALTINN_ROW_ID]: row[ALTINN_ROW_ID] })) : [],
          )
        : undefined;

      const lastIndex = formData && Array.isArray(formData) ? formData.length - 1 : -1;
      for (let rowIndex = 0; rowIndex <= lastIndex; rowIndex++) {
        const rowChildren: LayoutNode[] = [];

        const uuid = formData && formData[rowIndex][ALTINN_ROW_ID];
        if (uuid === undefined) {
          const path = `${item.dataModelBindings.group}[${rowIndex}]`;
          throw new MissingRowIdException(path);
        }

        for (const id of prototype.children) {
          const [multiPageIndex, childId] = item.edit?.multiPage ? id.split(':', 2) : [undefined, id];
          const child = ctx.generator.newChild({
            ctx,
            childId,
            parent: me,
            rowIndex,
            rowId: uuid,
            directMutators: [addMultiPageIndex(multiPageIndex)],
            recursiveMutators: [
              mutateComponentId(rowIndex),
              mutateDataModelBindings(props, rowIndex),
              mutateMapping(ctx, rowIndex),
            ],
          });
          child && rowChildren.push(child as LayoutNode);
        }

        rows.push({
          uuid,
          index: rowIndex,
          items: rowChildren,
        });
      }

      for (const gridRows of [
        'rowsBefore' in me.item ? me.item.rowsBefore : undefined,
        'rowsAfter' in me.item ? me.item.rowsAfter : undefined,
      ]) {
        if (gridRows) {
          this.innerGrid.stage2Rows(ctx, me, gridRows);
        }
      }

      me.item.rows = rows;

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

const mutateDataModelBindings: (
  props: ChildFactoryProps<'RepeatingGroup'>,
  rowIndex: number,
) => ChildMutator<'RepeatingGroup'> = (props, rowIndex) => (item) => {
  const groupBinding = 'dataModelBindings' in props.item ? props.item.dataModelBindings?.group : undefined;
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

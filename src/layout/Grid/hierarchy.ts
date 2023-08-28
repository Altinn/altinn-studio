import { nodesFromGrid } from 'src/layout/Grid/tools';
import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { GridRowsInternal } from 'src/layout/common.generated';
import type { ITextResource } from 'src/types';
import type {
  ChildFactory,
  HierarchyContext,
  HierarchyGenerator,
  UnprocessedItem,
} from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class GridHierarchyGenerator extends ComponentHierarchyGenerator<'Grid'> {
  private canRenderInTable(generator: HierarchyGenerator, childId: string, outputWarning = true): boolean {
    const prototype = generator.prototype(childId);
    const def = prototype && generator.getLayoutComponentObject(prototype.type);

    if (outputWarning && prototype && def?.canRenderInTable() === false) {
      window.logWarnOnce(
        `Grid component included a cell with component '${childId}', which ` +
          `is a '${prototype.type}' and cannot be rendered in a table.`,
      );
    }

    return def?.canRenderInTable() === true;
  }

  stage1(generator: HierarchyGenerator, item: Pick<UnprocessedItem<'Grid'>, 'rows' | 'id'>): void {
    for (const row of item.rows) {
      for (const cell of row.cells) {
        if (cell && 'component' in cell && cell.component) {
          const childId = cell.component;
          if (!this.canRenderInTable(generator, childId)) {
            continue;
          }

          generator.claimChild({
            childId,
            parentId: item.id,
          });
        }
      }
    }
  }

  stage2(ctx: HierarchyContext): ChildFactory<'Grid'> {
    return (props) => {
      const me = ctx.generator.makeNode(props);
      this.stage2Rows(ctx, me, me.item.rows);
      return me;
    };
  }

  public stage2Rows(ctx: HierarchyContext, me: LayoutNode, rows: GridRowsInternal) {
    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell && 'component' in cell) {
          const childId = cell.component as string;
          if (!this.canRenderInTable(ctx.generator, childId, false)) {
            delete cell['component'];
            continue;
          }

          const node = ctx.generator.newChild({
            ctx,
            childId,
            parent: me,
          });

          delete cell['component'];
          cell['node'] = node;
        }
      }
    }
  }

  childrenFromNode(node: LayoutNode<'Grid'>): LayoutNode[] {
    return nodesFromGrid(node);
  }

  rewriteTextBindingsForRows(node: LayoutNode, rows: GridRowsInternal, textResources: ITextResource[]) {
    if (node.rowIndex === undefined) {
      return;
    }

    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell && 'text' in cell && this.textResourceHasRepeatingGroupVariable(cell.text, textResources)) {
          cell.text = `${cell.text}-${node.rowIndex}`;
        }
      }
    }
  }

  rewriteTextBindings(node: LayoutNode<'Grid'>, textResources: ITextResource[]) {
    super.rewriteTextBindings(node, textResources);
    this.rewriteTextBindingsForRows(node, node.item.rows, textResources);
  }
}

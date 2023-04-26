import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { ChildFactory, HierarchyContext, UnprocessedItem } from 'src/utils/layout/HierarchyGenerator';

export class GridHierarchyGenerator extends ComponentHierarchyGenerator<'Grid'> {
  private canRenderInTable(childId: string, outputWarning = true): boolean {
    const prototype = this.generator.prototype(childId);
    const def = prototype && this.generator.getLayoutComponentObject(prototype.type);

    if (outputWarning && prototype && def?.canRenderInTable() === false) {
      console.warn(
        `Grid component included a cell with component '${childId}', which ` +
          `is a '${prototype.type}' and cannot be rendered in a table.`,
      );
    }

    return def?.canRenderInTable() === true;
  }

  stage1(item: UnprocessedItem<'Grid'>): void {
    for (const row of item.rows) {
      for (const cell of row.cells) {
        if (cell && 'component' in cell) {
          const childId = cell.component;
          if (!this.canRenderInTable(childId)) {
            continue;
          }

          this.generator.claimChild({
            childId,
            parentId: item.id,
          });
        }
      }
    }
  }

  stage2(ctx: HierarchyContext): ChildFactory<'Grid'> {
    return (props) => {
      const me = this.generator.makeNode(props);

      for (const row of me.item.rows) {
        for (const cell of row.cells) {
          if (cell && 'component' in cell) {
            const childId = cell.component as string;
            if (!this.canRenderInTable(childId, false)) {
              delete cell['component'];
              continue;
            }

            const node = this.generator.newChild({
              ctx,
              childId,
              parent: me,
            });

            delete cell['component'];
            cell['node'] = node;
          }
        }
      }

      return me;
    };
  }
}

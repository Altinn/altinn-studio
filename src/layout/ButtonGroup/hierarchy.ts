import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { ChildFactory, HierarchyGenerator, UnprocessedItem } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class ButtonGroupHierarchyGenerator extends ComponentHierarchyGenerator<'ButtonGroup'> {
  private canRenderInButtonGroup(generator: HierarchyGenerator, childId: string, outputWarning = true): boolean {
    const prototype = generator.prototype(childId);
    const def = prototype && generator.getLayoutComponentObject(prototype.type);

    if (outputWarning && prototype && !def?.canRenderInButtonGroup()) {
      console.warn(
        `ButtonGroup component included a component '${childId}', which ` +
          `is a '${prototype.type}' and cannot be rendered in a button group.`,
      );
    }

    return def?.canRenderInButtonGroup() === true;
  }

  stage1(generator, item): void {
    for (const childId of item.children) {
      if (childId) {
        if (!this.canRenderInButtonGroup(generator, childId)) {
          continue;
        }

        generator.claimChild({
          childId,
          parentId: item.id,
        });
      }
    }
  }

  stage2(ctx): ChildFactory<'ButtonGroup'> {
    return (props) => {
      const prototype = ctx.generator.prototype(ctx.id) as UnprocessedItem<'ButtonGroup'>;
      delete (props.item as any)['children'];
      const me = ctx.generator.makeNode(props);

      const childNodes: LayoutNode[] = [];
      for (const childId of prototype.children) {
        if (!this.canRenderInButtonGroup(ctx.generator, childId, false)) {
          continue;
        }

        const child = ctx.generator.newChild({
          ctx,
          parent: me,
          childId,
        });
        child && childNodes.push(child);
      }

      me.item.childComponents = childNodes;

      return me;
    };
  }

  childrenFromNode(node: LayoutNodeFromType<'ButtonGroup'>): LayoutNode[] {
    return node.item.childComponents;
  }
}

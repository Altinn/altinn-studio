import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { ChildFactory, HierarchyContext, HierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class AccordionGroupHierarchyGenerator extends ComponentHierarchyGenerator<'AccordionGroup'> {
  stage1(generator, item): void {
    for (const childId of item.children) {
      if (!this.canRenderInAccordionGroup(generator, childId)) {
        continue;
      }
      generator.claimChild({ childId, parentId: item.id });
    }
  }

  stage2(ctx: HierarchyContext): ChildFactory<'AccordionGroup'> {
    return this.processAccordionContent(ctx);
  }

  childrenFromNode(node: LayoutNodeFromType<'AccordionGroup'>): LayoutNode[] {
    return node.item.childComponents;
  }

  /**
   * Process the content of an AccordionGroup component and place each item on the components `childComponents` prop.
   */
  private processAccordionContent(ctx: HierarchyContext): ChildFactory<'AccordionGroup'> {
    return (props) => {
      const prototype = ctx.generator.prototype(ctx.id);

      delete (props.item as any)['children'];
      const me = ctx.generator.makeNode(props);

      const childNodes: LayoutNode[] = [];
      for (const childId of prototype.children) {
        if (!this.canRenderInAccordionGroup(ctx.generator, childId, false)) {
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

  /**
   * Check if a component can be rendered in an AccordionGroup.
   */
  private canRenderInAccordionGroup(generator: HierarchyGenerator, childId: string, outputWarning = true): boolean {
    const prototype = generator.prototype(childId);
    const def = prototype && generator.getLayoutComponentObject(prototype.type);

    if (outputWarning && prototype && !def?.canRenderInAccordionGroup()) {
      window.logWarn(
        `Accordion component included a component '${childId}', which ` +
          `is a '${prototype.type}' and cannot be rendered in an Accordion.`,
      );
    }

    return def?.canRenderInAccordionGroup() === true;
  }
}

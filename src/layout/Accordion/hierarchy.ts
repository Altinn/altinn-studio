import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type {
  ChildFactory,
  HierarchyContext,
  HierarchyGenerator,
  UnprocessedItem,
} from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class AccordionHierarchyGenerator extends ComponentHierarchyGenerator<'Accordion'> {
  stage1(generator: HierarchyGenerator, item: UnprocessedItem<'Accordion'>): void {
    for (const childId of item.children) {
      if (!this.canRenderInAccordion(generator, childId)) {
        continue;
      }
      generator.claimChild({ childId, parentId: item.id });
    }
  }

  stage2(ctx: HierarchyContext): ChildFactory<'Accordion'> {
    return this.processAccordionContent(ctx);
  }

  childrenFromNode(node: LayoutNode<'Accordion'>): LayoutNode[] {
    return node.item.childComponents;
  }

  /**
   * Process the content of an Accordion component and place each item on the components `childComponents` prop.
   */
  private processAccordionContent(ctx: HierarchyContext): ChildFactory<'Accordion'> {
    return (props) => {
      const prototype = ctx.generator.prototype(ctx.id) as UnprocessedItem<'Accordion'>;

      delete (props.item as any)['children'];
      const me = ctx.generator.makeNode(props);

      const childNodes: LayoutNode[] = [];
      for (const childId of prototype.children) {
        if (!this.canRenderInAccordion(ctx.generator, childId, false)) {
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
   * Check if a component can be rendered in an Accordion.
   */
  private canRenderInAccordion(generator: HierarchyGenerator, childId: string, outputWarning = true): boolean {
    const prototype = generator.prototype(childId);
    const def = prototype && generator.getLayoutComponentObject(prototype.type);

    if (outputWarning && prototype && !def?.canRenderInAccordion()) {
      window.logWarn(
        `Accordion component included a component '${childId}', which ` +
          `is a '${prototype.type}' and cannot be rendered in an Accordion.`,
      );
    }

    return def?.canRenderInAccordion() === true;
  }
}

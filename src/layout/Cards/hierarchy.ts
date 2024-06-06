import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { CardConfigInternal } from 'src/layout/Cards/config.generated';
import type {
  ChildFactory,
  HierarchyContext,
  HierarchyGenerator,
  UnprocessedItem,
} from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class CardsHierarchyGenerator extends ComponentHierarchyGenerator<'Cards'> {
  private canRenderInCardMedia(generator: HierarchyGenerator, childId: string, outputWarning = true): boolean {
    const prototype = generator.prototype(childId);
    const def = prototype && generator.getLayoutComponentObject(prototype.type);

    if (outputWarning && prototype && !def?.canRenderInCardsMedia()) {
      window.logWarnOnce(
        `Cards component included a component '${childId}' in the 'media' property, which ` +
          `is a '${prototype.type}' and cannot be rendered as Card media.`,
      );
    }

    return def?.canRenderInCardsMedia() === true;
  }

  private canRenderInCardChildren(generator: HierarchyGenerator, childId: string, outputWarning = true): boolean {
    const prototype = generator.prototype(childId);
    const def = prototype && generator.getLayoutComponentObject(prototype.type);

    if (outputWarning && prototype && !def?.canRenderInCards()) {
      window.logWarnOnce(
        `Cards component included a component '${childId}' in the 'children' property, which ` +
          `is a '${prototype.type}' and cannot be rendered as a Card child.`,
      );
    }

    return def?.canRenderInCards() === true;
  }

  stage1(generator: HierarchyGenerator, item: UnprocessedItem<'Cards'>): void {
    for (const { media, children } of item.cards) {
      if (media) {
        if (!this.canRenderInCardMedia(generator, media)) {
          continue;
        }

        generator.claimChild({
          childId: media,
          parentId: item.id,
        });
      }
      for (const child of children || []) {
        if (!this.canRenderInCardChildren(generator, child)) {
          continue;
        }

        generator.claimChild({
          childId: child,
          parentId: item.id,
        });
      }
    }
  }

  stage2(ctx: HierarchyContext): ChildFactory<'Cards'> {
    return (props) => {
      const prototype = ctx.generator.prototype(ctx.id) as UnprocessedItem<'Cards'>;
      delete props.item['children'];
      const me = ctx.generator.makeNode(props);

      const cardsInternal: CardConfigInternal[] = [];
      for (const { media, children, ...rest } of prototype.cards) {
        const card: CardConfigInternal = {
          mediaNode: undefined,
          childNodes: [],
          ...rest,
        };

        if (media && this.canRenderInCardMedia(ctx.generator, media, false)) {
          const mediaChild = ctx.generator.newChild({
            ctx,
            parent: me,
            childId: media,
          });
          if (mediaChild) {
            card.mediaNode = mediaChild;
          }
        }

        for (const child of children || []) {
          if (this.canRenderInCardChildren(ctx.generator, child, false)) {
            const childNode = ctx.generator.newChild({
              ctx,
              parent: me,
              childId: child,
            });
            if (childNode) {
              card.childNodes.push(childNode);
            }
          }
        }

        cardsInternal.push(card);
      }

      me.item.cardsInternal = cardsInternal;
      delete (me.item as any).cards;

      return me;
    };
  }

  childrenFromNode(node: LayoutNode<'Cards'>): LayoutNode[] {
    const nodes: LayoutNode[] = [];
    for (const child of node.item.cardsInternal) {
      if (child.mediaNode) {
        nodes.push(child.mediaNode);
      }
      nodes.push(...child.childNodes);
    }
    return nodes;
  }
}

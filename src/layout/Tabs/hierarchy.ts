import { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { CompTabsExternal, CompTabsInternal, TabConfigInternal } from 'src/layout/Tabs/config.generated';
import type {
  ChildFactory,
  HierarchyContext,
  HierarchyGenerator,
  UnprocessedItem,
} from 'src/utils/layout/HierarchyGenerator';
import type { BaseLayoutNode, LayoutNode } from 'src/utils/layout/LayoutNode';

export class TabsHierarchyGenerator extends ComponentHierarchyGenerator<'Tabs'> {
  /**
   * Check if a component can be rendered in Tabs component.
   */
  private canRenderInTabChildren(generator: HierarchyGenerator, childId: string, outputWarning = true): boolean {
    const prototype = generator.prototype(childId);
    const def = prototype && generator.getLayoutComponentObject(prototype.type);
    if (outputWarning && prototype && !def?.canRenderInTabs()) {
      window.logWarnOnce(
        `Tabs component included a component '${childId}' in the 'children' property, which ` +
          `is a '${prototype.type}' and cannot be rendered as a Tab child.`,
      );
    }

    return def?.canRenderInTabs() === true;
  }

  override stage1(generator: HierarchyGenerator, item: CompTabsExternal): void {
    item.tabs?.forEach((tab) => {
      tab.children?.forEach((childId) => {
        if (this.canRenderInTabChildren(generator, childId)) {
          generator.claimChild({ childId, parentId: item.id });
        }
      });
    });
  }

  override stage2(ctx: HierarchyContext): ChildFactory<'Tabs'> {
    return (props) => {
      const prototype = ctx.generator.prototype(ctx.id) as UnprocessedItem<'Tabs'>;
      const me = ctx.generator.makeNode(props);

      const tabsInternal: TabConfigInternal[] = [];
      prototype?.tabs?.forEach(({ children, ...rest }) => {
        const tab: TabConfigInternal = {
          childNodes: [],
          ...rest,
        };

        children.forEach((childId) => {
          if (this.canRenderInTabChildren(ctx.generator, childId, false)) {
            const childNode = ctx.generator.newChild({
              ctx,
              parent: me,
              childId,
            });
            if (childNode) {
              tab.childNodes.push(childNode);
            }
          }
        });
        tabsInternal.push(tab);
      });

      me.item.tabsInternal = tabsInternal;
      delete (me.item as any).tabs;
      return me;
    };
  }

  override childrenFromNode(node: BaseLayoutNode<CompTabsInternal, 'Tabs'>): LayoutNode[] {
    return node.item.tabsInternal.map((tab) => tab.childNodes).flat();
  }
}

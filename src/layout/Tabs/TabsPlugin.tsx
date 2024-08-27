import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { CompTypes } from 'src/layout/layout';
import type { TabConfig } from 'src/layout/Tabs/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  DefPluginChildClaimerProps,
  DefPluginExtraInItem,
  DefPluginState,
  DefPluginStateFactoryProps,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

export interface TabConfigInternal extends Omit<TabConfig, 'children'> {
  children: (LayoutNode | undefined)[];
}

interface ClaimMetadata {
  tabIdx: number;
  tabId: string;
  childIdx: number;
}

interface Config<Type extends CompTypes> {
  componentType: Type;
  expectedFromExternal: {
    tabs: TabConfig[];
  };
  metaData: ClaimMetadata;
  extraState: undefined;
  extraInItem: {
    tabs: undefined;
    tabsInternal: TabConfigInternal[];
  };
}

export class TabsPlugin<Type extends CompTypes>
  extends NodeDefPlugin<Config<Type>>
  implements NodeDefChildrenPlugin<Config<Type>>
{
  protected component: ComponentConfig | undefined;

  makeImport() {
    return new CG.import({
      import: 'TabsPlugin',
      from: 'src/layout/Tabs/TabsPlugin',
    });
  }

  addToComponent(component: ComponentConfig): void {
    this.component = component;
    if (component.config.category !== CompCategory.Container) {
      throw new Error('TabsPlugin can only be used with container components');
    }
  }

  makeGenericArgs(): string {
    return `'${this.component!.type}'`;
  }

  claimChildren({ item, claimChild, getProto }: DefPluginChildClaimerProps<Config<Type>>): void {
    for (const [tabIdx, tab] of (item.tabs || []).entries()) {
      for (const [childIdx, child] of tab.children.entries()) {
        const proto = getProto(child);
        if (!proto) {
          continue;
        }
        if (proto.capabilities.renderInTabs === false) {
          window.logWarn(
            `Tabs component included a component '${child}', which ` +
              `is a '${proto.type}' and cannot be rendered as a Tabs child.`,
          );
          continue;
        }
        claimChild(child, { tabIdx, tabId: tab.id, childIdx });
      }
    }
  }

  extraNodeGeneratorChildren(): string {
    const GenerateNodeChildren = new CG.import({
      import: 'GenerateNodeChildren',
      from: 'src/utils/layout/generator/LayoutSetGenerator',
    });
    return `<${GenerateNodeChildren} claims={props.childClaims} pluginKey='${this.getKey()}' />`;
  }

  itemFactory({ item }: DefPluginStateFactoryProps<Config<Type>>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tabsInternal = structuredClone((item as any).tabs || []) as TabConfigInternal[];

    // Remove all children, as they will be added as nodes later:
    for (const tab of tabsInternal) {
      tab.children = [];
    }

    return {
      tabs: undefined,
      tabsInternal,
    } as DefPluginExtraInItem<Config<Type>>;
  }

  pickDirectChildren(
    state: DefPluginState<Config<Type>>,
    restriction?: TraversalRestriction | undefined,
  ): LayoutNode[] {
    const out: LayoutNode[] = [];
    if (restriction !== undefined) {
      return out;
    }

    for (const tab of state.item?.tabsInternal || []) {
      for (const child of tab.children) {
        child && out.push(child);
      }
    }

    return out;
  }

  addChild(
    state: DefPluginState<Config<Type>>,
    childNode: LayoutNode,
    metadata: ClaimMetadata,
  ): Partial<DefPluginState<Config<Type>>> {
    const tabsInternal = [...(state.item?.tabsInternal || [])];
    const tab = tabsInternal[metadata.tabIdx];
    if (!tab) {
      throw new Error(`Tab with index ${metadata.tabIdx} not found`);
    }
    const children = [...tab.children];
    children[metadata.childIdx] = childNode;
    tabsInternal[metadata.tabIdx] = { ...tabsInternal[metadata.tabIdx], children };
    return { item: { ...state.item, tabs: undefined, tabsInternal } } as Partial<DefPluginState<Config<Type>>>;
  }

  removeChild(state: DefPluginState<Config<Type>>, childNode: LayoutNode, metadata: ClaimMetadata) {
    const tabsInternal = [...(state.item?.tabsInternal || [])];
    const tab = tabsInternal[metadata.tabIdx];
    if (!tab) {
      throw new Error(`Tab with index ${metadata.tabIdx} not found`);
    }
    const children = [...tab.children];
    children[metadata.childIdx] = undefined;
    tabsInternal[metadata.tabIdx] = { ...tabsInternal[metadata.tabIdx], children };
    return { item: { ...state.item, tabs: undefined, tabsInternal } } as Partial<DefPluginState<Config<Type>>>;
  }

  isChildHidden(_state: DefPluginState<Config<Type>>, _childNode: LayoutNode): boolean {
    return false;
  }
}

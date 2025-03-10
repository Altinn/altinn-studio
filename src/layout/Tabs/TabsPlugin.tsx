import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { CompTypes } from 'src/layout/layout';
import type { TabConfig } from 'src/layout/Tabs/config.generated';
import type {
  DefPluginChildClaimerProps,
  DefPluginExtraInItem,
  DefPluginState,
  DefPluginStateFactoryProps,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';

export interface TabConfigInternal extends Omit<TabConfig, 'children'> {
  childIds: string[];
}

interface Config<Type extends CompTypes> {
  componentType: Type;
  expectedFromExternal: {
    tabs: TabConfig[];
  };
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

  getKey(): string {
    return 'TabsPlugin';
  }

  claimChildren({ item, claimChild, getProto }: DefPluginChildClaimerProps<Config<Type>>): void {
    for (const tab of (item.tabs || []).values()) {
      for (const child of tab.children.values()) {
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
        claimChild(child);
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

  itemFactory({ item, idMutators }: DefPluginStateFactoryProps<Config<Type>>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tabsInternal = structuredClone((item as any).tabs || []) as TabConfigInternal[];

    // Remove all children, as they will be added as nodes later:
    for (const tab of tabsInternal) {
      const children = (tab as unknown as TabConfig).children ?? [];
      tab.childIds = children.map((childId) => idMutators.reduce((id, mutator) => mutator(id), childId));
      (tab as unknown as TabConfig).children = [];
    }

    return {
      tabs: undefined,
      tabsInternal,
    } as DefPluginExtraInItem<Config<Type>>;
  }

  pickDirectChildren(state: DefPluginState<Config<Type>>, restriction?: number | undefined | undefined): string[] {
    const out: string[] = [];
    if (restriction !== undefined) {
      return out;
    }

    for (const tab of state.item?.tabsInternal || []) {
      for (const child of tab.childIds) {
        child && out.push(child);
      }
    }

    return out;
  }

  isChildHidden(_state: DefPluginState<Config<Type>>, _childId: string): boolean {
    return false;
  }
}

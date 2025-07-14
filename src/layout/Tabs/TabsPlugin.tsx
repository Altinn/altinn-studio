import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { CompTypes } from 'src/layout/layout';
import type { TabConfig } from 'src/layout/Tabs/config.generated';
import type { DefPluginChildClaimerProps, NodeDefChildrenPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';

interface Config<Type extends CompTypes> {
  componentType: Type;
  expectedFromExternal: {
    tabs: TabConfig[];
  };
  extraState: undefined;
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

  claimChildren({ item, claimChild, getType, getCapabilities }: DefPluginChildClaimerProps<Config<Type>>): void {
    for (const tab of (item.tabs || []).values()) {
      for (const child of tab.children.values()) {
        const type = getType(child);
        if (!type) {
          continue;
        }
        const capabilities = getCapabilities(type);
        if (!capabilities.renderInTabs) {
          window.logWarn(
            `Tabs component included a component '${child}', which ` +
              `is a '${type}' and cannot be rendered as a Tabs child.`,
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
}

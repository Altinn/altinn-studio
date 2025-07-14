import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { CardConfig } from 'src/layout/Cards/config.generated';
import type { CompTypes } from 'src/layout/layout';
import type { DefPluginChildClaimerProps, NodeDefChildrenPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';

interface Config<Type extends CompTypes> {
  componentType: Type;
  expectedFromExternal: {
    cards: CardConfig[];
  };
  extraState: undefined;
}

export class CardsPlugin<Type extends CompTypes>
  extends NodeDefPlugin<Config<Type>>
  implements NodeDefChildrenPlugin<Config<Type>>
{
  protected component: ComponentConfig | undefined;

  makeImport() {
    return new CG.import({
      import: 'CardsPlugin',
      from: 'src/layout/Cards/CardsPlugin',
    });
  }

  addToComponent(component: ComponentConfig): void {
    this.component = component;
    if (component.config.category !== CompCategory.Container) {
      throw new Error('CardsPlugin can only be used with container components');
    }
  }

  getKey(): string {
    return 'CardsPlugin';
  }

  makeGenericArgs(): string {
    return `'${this.component!.type}'`;
  }

  claimChildren({ item, claimChild, getType, getCapabilities }: DefPluginChildClaimerProps<Config<Type>>): void {
    for (const card of (item.cards || []).values()) {
      if (card.media) {
        const type = getType(card.media);
        if (!type) {
          continue;
        }
        const capabilities = getCapabilities(type);
        if (!capabilities.renderInCardsMedia) {
          window.logWarn(
            `Cards component included a component '${card.media}', which ` +
              `is a '${type}' and cannot be rendered as Card media.`,
          );
          continue;
        }
        claimChild(card.media);
      }

      for (const child of card.children?.values() ?? []) {
        const type = getType(child);
        if (!type) {
          continue;
        }
        const capabilities = getCapabilities(type);
        if (!capabilities.renderInCards) {
          window.logWarn(
            `Cards component included a component '${child}', which ` +
              `is a '${type}' and cannot be rendered as a Card child.`,
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

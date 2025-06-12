import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { CardConfigExternal } from 'src/layout/Cards/config.generated';
import type { CompTypes } from 'src/layout/layout';
import type {
  DefPluginChildClaimerProps,
  DefPluginExtraInItem,
  DefPluginState,
  DefPluginStateFactoryProps,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';

export interface CardInternal extends Omit<CardConfigExternal, 'children' | 'media'> {
  childIds?: string[];
  mediaId?: string;
}

interface Config<Type extends CompTypes> {
  componentType: Type;
  expectedFromExternal: {
    cards: CardConfigExternal[];
  };
  extraState: undefined;
  extraInItem: {
    cards: undefined;
    cardsInternal: CardInternal[];
  };
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

  itemFactory({ item, idMutators, getCapabilities, layoutMap }: DefPluginStateFactoryProps<Config<Type>>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cardsInternal = structuredClone((item as any).cards || []) as CardInternal[];

    for (const card of cardsInternal) {
      const children = (card as CardConfigExternal).children ?? [];
      card.childIds = [];
      for (const childId of children) {
        const rawLayout = layoutMap[childId];
        const capabilities = rawLayout && getCapabilities(rawLayout.type);
        if (!capabilities || !capabilities.renderInCards) {
          // No need to log again, we already do that in claimChildren
          continue;
        }
        let id = childId;
        for (const mutator of idMutators) {
          id = mutator(id);
        }
        card.childIds.push(id);
      }
      const mediaId = (card as CardConfigExternal).media;
      const rawMediaLayout = mediaId && layoutMap[mediaId];
      const mediaCapabilities = rawMediaLayout && getCapabilities(rawMediaLayout.type);
      if (mediaCapabilities && mediaCapabilities.renderInCardsMedia && mediaId) {
        card.mediaId = idMutators.reduce((id, mutator) => mutator(id), mediaId);
      }

      (card as CardConfigExternal).children = undefined;
      (card as CardConfigExternal).media = undefined;
    }

    return {
      cards: undefined,
      cardsInternal,
    } as DefPluginExtraInItem<Config<Type>>;
  }

  isChildHidden(_state: DefPluginState<Config<Type>>, _childId: string): boolean {
    return false;
  }
}

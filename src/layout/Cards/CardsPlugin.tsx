import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { CardConfigExternal } from 'src/layout/Cards/config.generated';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  DefPluginChildClaimerProps,
  DefPluginExtraInItem,
  DefPluginState,
  DefPluginStateFactoryProps,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

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

  claimChildren({ item, claimChild, getProto }: DefPluginChildClaimerProps<Config<Type>>): void {
    for (const card of (item.cards || []).values()) {
      if (card.media) {
        const proto = getProto(card.media);
        if (!proto) {
          continue;
        }
        if (!proto.capabilities.renderInCardsMedia) {
          window.logWarn(
            `Cards component included a component '${card.media}', which ` +
              `is a '${proto.type}' and cannot be rendered as Card media.`,
          );
          continue;
        }
        claimChild(card.media);
      }

      for (const child of card.children?.values() ?? []) {
        const proto = getProto(child);
        if (!proto) {
          continue;
        }
        if (!proto.capabilities.renderInCards) {
          window.logWarn(
            `Cards component included a component '${child}', which ` +
              `is a '${proto.type}' and cannot be rendered as a Card child.`,
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
    const cardsInternal = structuredClone((item as any).cards || []) as CardInternal[];

    for (const card of cardsInternal) {
      const children = (card as CardConfigExternal).children ?? [];
      const mediaId = (card as CardConfigExternal).media;
      card.childIds = children.map((childId) => idMutators.reduce((id, mutator) => mutator(id), childId));
      card.mediaId = mediaId && idMutators.reduce((id, mutator) => mutator(id), mediaId);
      (card as CardConfigExternal).children = undefined;
      (card as CardConfigExternal).media = undefined;
    }

    return {
      cards: undefined,
      cardsInternal,
    } as DefPluginExtraInItem<Config<Type>>;
  }

  pickDirectChildren(state: DefPluginState<Config<Type>>, restriction?: TraversalRestriction | undefined): string[] {
    const out: string[] = [];
    if (restriction !== undefined) {
      return out;
    }

    for (const card of Object.values(state.item?.cardsInternal || [])) {
      if (card.mediaId) {
        out.push(card.mediaId);
      }
      for (const childId of card.childIds ?? []) {
        childId && out.push(childId);
      }
    }

    return out;
  }

  isChildHidden(_state: DefPluginState<Config<Type>>, _childNode: LayoutNode): boolean {
    return false;
  }
}

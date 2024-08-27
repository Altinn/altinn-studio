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
  children?: (LayoutNode | undefined)[];
  media?: LayoutNode;
}

interface ClaimMetadata {
  cardIdx: number;
  child: number | 'media';
}

interface Config<Type extends CompTypes> {
  componentType: Type;
  expectedFromExternal: {
    cards: CardConfigExternal[];
  };
  childClaimMetadata: ClaimMetadata;
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

  makeGenericArgs(): string {
    return `'${this.component!.type}'`;
  }

  claimChildren({ item, claimChild, getProto }: DefPluginChildClaimerProps<Config<Type>>): void {
    for (const [cardIdx, card] of (item.cards || []).entries()) {
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
        claimChild(card.media, { cardIdx, child: 'media' });
      }

      for (const [childIdx, child] of card.children?.entries() ?? []) {
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
        claimChild(child, { cardIdx, child: childIdx });
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
    const cardsInternal = structuredClone((item as any).cards || []) as CardInternal[];

    // Remove all children, as they will be added as nodes later:
    for (const card of cardsInternal) {
      card.children = [];
      card.media = undefined;
    }

    return {
      cards: undefined,
      cardsInternal,
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

    for (const card of Object.values(state.item?.cardsInternal || [])) {
      if (card.media) {
        out.push(card.media);
      }
      for (const child of card.children ?? []) {
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
    const cardsInternal = [...(state.item?.cardsInternal || [])];
    const card = cardsInternal[metadata.cardIdx] ?? {};
    if (metadata.child === 'media') {
      cardsInternal[metadata.cardIdx] = { ...card, media: childNode };
    } else {
      const children = [...(card.children || [])];
      children[metadata.child] = childNode;
      cardsInternal[metadata.cardIdx] = { ...card, children };
    }

    return { item: { ...state.item, cardsInternal } } as Partial<DefPluginState<Config<Type>>>;
  }

  removeChild(
    state: DefPluginState<Config<Type>>,
    _childNode: LayoutNode,
    metadata: ClaimMetadata,
  ): Partial<DefPluginState<Config<Type>>> {
    const cardsInternal = [...(state.item?.cardsInternal || [])];
    const card = cardsInternal[metadata.cardIdx] ?? {};
    if (metadata.child === 'media') {
      cardsInternal[metadata.cardIdx] = { ...card, media: undefined };
    } else {
      const children = [...(card.children || [])];
      children[metadata.child] = undefined;
      cardsInternal[metadata.cardIdx] = { ...card, children };
    }

    return { item: { ...state.item, cardsInternal } } as Partial<DefPluginState<Config<Type>>>;
  }

  isChildHidden(_state: DefPluginState<Config<Type>>, _childNode: LayoutNode): boolean {
    return false;
  }
}

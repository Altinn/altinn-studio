import { CG } from 'src/codegen/CG';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import { typedBoolean } from 'src/utils/typing';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { IDataModelBindingsLikert } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  DefPluginChildClaimerProps,
  DefPluginExtraInItem,
  DefPluginState,
  DefPluginStateFactoryProps,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';
import type { BaseRow } from 'src/utils/layout/types';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

interface LikertRow extends BaseRow {
  itemNode: LayoutNode<'LikertItem'> | undefined;
}

interface Config {
  componentType: 'Likert';
  expectedFromExternal: {
    dataModelBindings: IDataModelBindingsLikert;
  };
  extraInItem: {
    rows: (LikertRow | undefined)[];
  };
}

export class LikertRowsPlugin extends NodeDefPlugin<Config> implements NodeDefChildrenPlugin<Config> {
  makeImport() {
    return new CG.import({
      import: 'LikertRowsPlugin',
      from: 'src/layout/Likert/Generator/LikertRowsPlugin',
    });
  }

  addToComponent(_component: ComponentConfig): void {}

  extraNodeGeneratorChildren(): string {
    const LikertGeneratorChildren = new CG.import({
      import: 'LikertGeneratorChildren',
      from: 'src/layout/Likert/Generator/LikertGeneratorChildren',
    });
    return `<${LikertGeneratorChildren} />`;
  }

  itemFactory(_props: DefPluginStateFactoryProps<Config>) {
    // Likert will have exactly _zero_ rows to begin with. We can't rely on addChild() being called when there are
    // no children, so to start off we'll have to initialize it all with no rows to avoid later code crashing
    // when there's no array of rows yet.
    return {
      rows: [],
    } as DefPluginExtraInItem<Config>;
  }

  claimChildren(_props: DefPluginChildClaimerProps<Config>) {}

  pickDirectChildren(state: DefPluginState<Config>, restriction?: TraversalRestriction | undefined): LayoutNode[] {
    if (restriction !== undefined) {
      const node = state.item?.rows[restriction]?.itemNode;
      return node ? [node] : [];
    }

    return state.item?.rows.map((row) => row?.itemNode).filter(typedBoolean) ?? [];
  }

  addChild(
    state: DefPluginState<Config>,
    childNode: LayoutNode,
    _metadata: undefined,
    row: BaseRow | undefined,
  ): Partial<DefPluginState<Config>> {
    if (!childNode.isType('LikertItem')) {
      throw new Error(`Child node of Likert component must be of type 'LikertItem'`);
    }

    const rowIndex = childNode.rowIndex;
    if (rowIndex === undefined || rowIndex !== row?.index) {
      throw new Error(`Child node of Likert component missing 'row' property`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const i = state.item as any;
    const rows = (i && 'rows' in i ? [...i.rows] : []) as LikertRow[];

    rows[rowIndex] = { ...(rows[rowIndex] || {}), ...row, itemNode: childNode };

    return {
      item: {
        ...state.item,
        rows,
      },
    } as Partial<DefPluginState<Config>>;
  }

  removeChild(
    state: DefPluginState<Config>,
    childNode: LayoutNode,
    _metadata: undefined,
    row: BaseRow | undefined,
  ): Partial<DefPluginState<Config>> {
    const rowIndex = childNode.rowIndex;
    if (rowIndex === undefined || rowIndex !== row?.index) {
      throw new Error(`Child node of Likert component missing 'row' property`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const i = state.item as any;
    const rows = (i && 'rows' in i ? [...i.rows] : []) as LikertRow[];

    rows[rowIndex] = { ...(rows[rowIndex] || {}), ...row, itemNode: undefined };

    return {
      item: {
        ...state.item,
        rows,
      },
    } as Partial<DefPluginState<Config>>;
  }

  isChildHidden(_state: DefPluginState<Config>, _childNode: LayoutNode): boolean {
    return false;
  }
}

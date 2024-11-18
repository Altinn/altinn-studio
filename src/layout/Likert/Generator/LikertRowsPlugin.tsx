import { CG } from 'src/codegen/CG';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import { typedBoolean } from 'src/utils/typing';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { IDataModelBindingsLikert } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodesContext } from 'src/utils/layout/NodesContext';
import type {
  DefPluginChildClaimerProps,
  DefPluginExtraInItem,
  DefPluginState,
  DefPluginStateFactoryProps,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';
import type { BaseRow } from 'src/utils/layout/types';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

export interface LikertRow extends BaseRow {
  itemNodeId: string | undefined;
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
  public settings = {
    internalProp: 'rows',
  };

  makeImport() {
    return new CG.import({
      import: 'LikertRowsPlugin',
      from: 'src/layout/Likert/Generator/LikertRowsPlugin',
    });
  }

  getKey(): string {
    return 'LikertRowsPlugin';
  }

  addToComponent(_component: ComponentConfig): void {}

  makeConstructorArgs(_asGenericArgs = false): string {
    return '';
  }

  extraNodeGeneratorChildren(): string {
    const LikertGeneratorChildren = new CG.import({
      import: 'LikertGeneratorChildren',
      from: 'src/layout/Likert/Generator/LikertGeneratorChildren',
    });
    return `<${LikertGeneratorChildren} plugin={this.plugins['${this.getKey()}']} />`;
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

  pickDirectChildren(state: DefPluginState<Config>, restriction?: TraversalRestriction | undefined): string[] {
    if (restriction !== undefined) {
      const nodeId = state.item?.rows[restriction]?.itemNodeId;
      return nodeId ? [nodeId] : [];
    }

    return state.item?.rows.map((row) => row?.itemNodeId).filter(typedBoolean) ?? [];
  }

  isChildHidden(_state: DefPluginState<Config>, _childNode: LayoutNode): boolean {
    return false;
  }

  stateIsReady(state: DefPluginState<Config>, fullState: NodesContext): boolean {
    if (!super.stateIsReady(state, fullState)) {
      return false;
    }

    const internalProp = this.settings.internalProp;
    const rows = state.item?.[internalProp] as (LikertRow | undefined)[];
    return rows?.every((row) => (row ? row.uuid !== undefined && row.itemNodeId !== undefined : true)) ?? false;
  }
}

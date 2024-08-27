import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { GridRows } from 'src/layout/common.generated';
import type { GridCellNode, GridRowsInternal } from 'src/layout/Grid/types';
import type { CompTypes, TypesFromCategory } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  DefPluginChildClaimerProps,
  DefPluginExprResolver,
  DefPluginExtraInItem,
  DefPluginState,
  DefPluginStateFactoryProps,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

interface ClaimMetadata {
  rowIdx: number;
  cellIdx: number;
}

interface ExternalConfig {
  componentType?: TypesFromCategory<CompCategory.Container>;
  externalProp?: string;
  internalProp?: string;
  optional?: boolean;
}

interface Config<Type extends CompTypes, ExternalProp extends string, InternalProp extends string> {
  componentType: Type;
  expectedFromExternal: {
    [key in ExternalProp]?: GridRows;
  };
  childClaimMetadata: ClaimMetadata;
  extraState: undefined;
  extraInItem: {
    [key in ExternalProp]: undefined;
  } & {
    [key in InternalProp]: GridRowsInternal;
  };
}

const defaultConfig = {
  componentType: 'unknown' as TypesFromCategory<CompCategory.Container>,
  externalProp: 'rows' as const,
  internalProp: 'rowsInternal' as const,
  optional: false as const,
};

type ConfigOrDefault<C, D> = D & C extends never ? C : D & C;
type Combined<E extends ExternalConfig> = {
  [key in keyof Required<ExternalConfig>]: Exclude<ConfigOrDefault<E[key], (typeof defaultConfig)[key]>, undefined>;
};
type Setting<E extends ExternalConfig, P extends keyof ExternalConfig> = Combined<E>[P];

type ToInternal<E extends ExternalConfig> = Config<
  Setting<E, 'componentType'>,
  Setting<E, 'externalProp'>,
  Setting<E, 'internalProp'>
>;

export class GridRowsPlugin<E extends ExternalConfig>
  extends NodeDefPlugin<ToInternal<E>>
  implements NodeDefChildrenPlugin<ToInternal<E>>
{
  protected settings: Combined<E>;
  protected component: ComponentConfig | undefined;

  constructor(settings?: E) {
    super({
      ...defaultConfig,
      ...settings,
    } as Combined<E>);
  }

  makeImport() {
    return new CG.import({
      import: 'GridRowsPlugin',
      from: 'src/layout/Grid/GridRowsPlugin',
    });
  }

  getKey(): string {
    return [this.constructor.name, this.settings.externalProp].join('/');
  }

  makeConstructorArgs(asGenericArgs = false): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.settings.componentType = this.component!.type as any;
    return super.makeConstructorArgsWithoutDefaultSettings(defaultConfig, asGenericArgs);
  }

  addToComponent(component: ComponentConfig): void {
    this.component = component;
    if (component.config.category !== CompCategory.Container) {
      throw new Error('GridRowsPlugin can only be used with container components');
    }

    const prop = CG.common('GridRows');
    if (this.settings.optional) {
      prop.optional();
    }

    component.addProperty(new CG.prop(this.settings.externalProp, prop));
  }

  claimChildren({ item, claimChild, getProto }: DefPluginChildClaimerProps<ToInternal<E>>): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (item as any)[this.settings.externalProp] as GridRows | undefined;
    if (!rows) {
      return;
    }

    for (const [rowIdx, row] of rows.entries()) {
      for (const [cellIdx, cell] of row.cells.entries()) {
        if (cell && 'component' in cell && cell.component) {
          const proto = getProto(cell.component);
          if (!proto) {
            continue;
          }
          if (!proto.capabilities.renderInTable) {
            window.logWarn(
              `Grid-like component included a component '${cell.component}', which ` +
                `is a '${proto.type}' and cannot be rendered in a table.`,
            );
            continue;
          }
          claimChild(cell.component, { rowIdx, cellIdx });
        }
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

  itemFactory({ item }: DefPluginStateFactoryProps<ToInternal<E>>) {
    // Components with Grid rows may not have component references in all the cells, so we cannot rely on
    // addChild() alone to produce a fully complete state. This adds all the non-component cells to the item
    // state as soon as the node state is first created.
    return {
      [this.settings.externalProp]: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [this.settings.internalProp]: structuredClone((item as any)[this.settings.externalProp]),
    } as DefPluginExtraInItem<ToInternal<E>>;
  }

  evalDefaultExpressions(_props: DefPluginExprResolver<ToInternal<E>>): DefPluginExtraInItem<ToInternal<E>> {
    // If we don't set this to undefined, we run the risk that the regular evalExpressions() run will set
    // the external prop back to its original state.
    return {
      [this.settings.externalProp]: undefined,
    } as DefPluginExtraInItem<ToInternal<E>>;
  }

  pickDirectChildren(
    state: DefPluginState<ToInternal<E>>,
    restriction?: TraversalRestriction | undefined,
  ): LayoutNode[] {
    const out: LayoutNode[] = [];
    if (restriction !== undefined) {
      return out;
    }

    const rows = (state.item?.[this.settings.internalProp] || []) as GridRowsInternal;
    for (const row of rows) {
      for (const cell of row.cells) {
        if (cell && 'node' in cell && cell.node) {
          out.push(cell.node);
        }
      }
    }

    return out;
  }

  addChild(
    state: DefPluginState<ToInternal<E>>,
    node: LayoutNode,
    metadata: ClaimMetadata,
  ): Partial<DefPluginState<ToInternal<E>>> {
    const rowsInternal = [...(state.item?.[this.settings.internalProp] ?? [])] as GridRowsInternal;
    const row =
      rowsInternal[metadata.rowIdx] ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      structuredClone((state as any).layout[this.settings.externalProp][metadata.rowIdx]);

    const cells = [...(row.cells ?? [])];
    const overwriteLayout = { component: undefined };
    cells[metadata.cellIdx] = { ...cells[metadata.cellIdx], ...overwriteLayout, node } as GridCellNode;
    rowsInternal[metadata.rowIdx] = { ...row, cells };

    return {
      item: {
        ...state.item,
        [this.settings.externalProp]: undefined,
        [this.settings.internalProp]: rowsInternal,
      },
    } as Partial<DefPluginState<ToInternal<E>>>;
  }

  removeChild(
    state: DefPluginState<ToInternal<E>>,
    node: LayoutNode,
    metadata: ClaimMetadata,
  ): Partial<DefPluginState<ToInternal<E>>> {
    const rowsInternal = [...(state.item?.[this.settings.internalProp] ?? [])] as GridRowsInternal;
    const row =
      rowsInternal[metadata.rowIdx] ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      structuredClone((state as any).layout[this.settings.externalProp][metadata.rowIdx]);

    const cells = [...(row.cells ?? [])];
    const cell = cells[metadata.cellIdx];
    if (cell && 'node' in cell && cell.node === node) {
      cells[metadata.cellIdx] = { ...cell };
      delete cells[metadata.cellIdx]!['node'];
      rowsInternal[metadata.rowIdx] = { ...row, cells };
    }

    return {
      item: {
        ...state.item,
        [this.settings.externalProp]: undefined,
        [this.settings.internalProp]: rowsInternal,
      },
    } as Partial<DefPluginState<ToInternal<E>>>;
  }

  isChildHidden(_state: DefPluginState<ToInternal<E>>, _childNode: LayoutNode): boolean {
    // There are no specific rules for hiding components in a Grid (yet). This should be implemented if we
    // add support for hiding a row or a cell (which should also hide the component inside)
    return false;
  }
}

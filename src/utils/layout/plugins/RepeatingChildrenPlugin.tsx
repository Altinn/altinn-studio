import dot from 'dot-object';

import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import type { TypesFromCategory } from 'src/layout/layout';
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

export interface RepChildrenRow extends BaseRow {
  items: LayoutNode[] | undefined;
}

interface Config<
  T extends TypesFromCategory<CompCategory.Container>,
  ExternalProp extends string,
  InternalProp extends string,
  Extras,
> {
  componentType: T;
  settings: Required<Pick<ExternalConfig, 'title' | 'description'>>;
  expectedFromExternal: {
    [key in ExternalProp]: string[];
  };
  extraInItem: { [key in ExternalProp]: undefined } & {
    [key in InternalProp]: ((RepChildrenRow & Extras) | undefined)[];
  };
}

export interface ExternalConfig {
  componentType?: TypesFromCategory<CompCategory.Container>;
  dataModelGroupBinding?: string;
  multiPageSupport?: false | string; // Path to property that indicates if multi-page support is enabled
  extraRowState?: unknown;
  externalProp?: string;
  internalProp?: string;
  title?: string;
  description?: string;
}

const defaultConfig = {
  componentType: 'unknown' as TypesFromCategory<CompCategory.Container>,
  dataModelGroupBinding: 'group' as const,
  multiPageSupport: false as const,
  extraRowState: undefined,
  externalProp: 'children' as const,
  internalProp: 'rows' as const,
  title: 'Children',
  description:
    'List of child component IDs to show inside (will be repeated according to the number of rows in the data model binding)',
};

type FromImport<I> = I extends GenerateImportedSymbol<infer T> ? T : I;
type ConfigOrDefault<C, D> = D & C extends never ? C : D & C;
type Combined<E extends ExternalConfig> = {
  [key in keyof Required<ExternalConfig>]: Exclude<ConfigOrDefault<E[key], (typeof defaultConfig)[key]>, undefined>;
};
type Setting<E extends ExternalConfig, P extends keyof ExternalConfig> = Combined<E>[P];

type ToInternal<E extends ExternalConfig> = Config<
  Setting<E, 'componentType'>,
  Setting<E, 'externalProp'>,
  Setting<E, 'internalProp'>,
  FromImport<Setting<E, 'extraRowState'>>
>;

type Row<E extends ExternalConfig> = (RepChildrenRow & E['extraRowState']) | undefined;

export class RepeatingChildrenPlugin<E extends ExternalConfig>
  extends NodeDefPlugin<ToInternal<E>>
  implements NodeDefChildrenPlugin<ToInternal<E>>
{
  protected settings: Combined<E>;
  protected component: ComponentConfig | undefined;
  constructor(settings: E) {
    super({
      ...defaultConfig,
      ...settings,
    } as Combined<E>);
  }

  makeImport() {
    return new CG.import({
      import: 'RepeatingChildrenPlugin',
      from: 'src/utils/layout/plugins/RepeatingChildrenPlugin',
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
      throw new Error('RepeatingChildrenPlugin can only be used with container components');
    }

    component.addProperty(
      new CG.prop(
        this.settings.externalProp,
        new CG.arr(new CG.str()).setTitle(this.settings.title).setDescription(this.settings.description),
      ),
    );
  }

  extraNodeGeneratorChildren(): string {
    const NodeRepeatingChildren = new CG.import({
      import: 'NodeRepeatingChildren',
      from: 'src/utils/layout/generator/NodeRepeatingChildren',
    });
    const multiPageSupport = this.settings.multiPageSupport === false ? 'false' : `'${this.settings.multiPageSupport}'`;
    return `
      <${NodeRepeatingChildren}
        claims={props.childClaims}
        binding={'${this.settings.dataModelGroupBinding}'}
        internalProp={'${this.settings.internalProp}'}
        externalProp={'${this.settings.externalProp}'}
        multiPageSupport={${multiPageSupport}}
        pluginKey='${this.getKey()}'
      />`.trim();
  }

  extraMethodsInDef(): string[] {
    const ExprResolver = new CG.import({
      import: 'ExprResolver',
      from: 'src/layout/LayoutComponent',
    });

    return [
      `// You have to implement this method because the component uses the RepeatingChildrenPlugin
      abstract evalExpressionsForRow(props: ${ExprResolver}<'${this.component!.type}'>): unknown;`,
    ];
  }

  itemFactory(_props: DefPluginStateFactoryProps<ToInternal<E>>) {
    // Components with repeating children will have exactly _zero_ rows to begin with. We can't rely on
    // addChild() being called when there are no children, so to start off we'll have to initialize it all
    // with no rows to avoid later code crashing when there's no array of rows yet.
    return {
      [this.settings.externalProp]: undefined,
      [this.settings.internalProp]: [],
    } as DefPluginExtraInItem<ToInternal<E>>;
  }

  claimChildren({ claimChild, item }: DefPluginChildClaimerProps<ToInternal<E>>): void {
    const multiPage =
      this.settings.multiPageSupport !== false && dot.pick(this.settings.multiPageSupport, item) === true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const id of (item as any)[this.settings.externalProp]) {
      if (multiPage) {
        if (!/^\d+:[^:]+$/u.test(id)) {
          throw new Error(
            `Ved bruk av multiPage må ID være på formatet 'sideIndeks:komponentId' (f.eks. '0:komponentId'). Referansen '${id}' er ikke gyldig.`,
          );
        }

        const [, childId] = id.split(':', 2);
        claimChild(childId, undefined);
      } else {
        claimChild(id, undefined);
      }
    }
  }

  pickDirectChildren(state: DefPluginState<ToInternal<E>>, restriction?: TraversalRestriction): LayoutNode[] {
    const out: LayoutNode[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (state.item as any)[this.settings.internalProp] as Row<E>[];
    if (!rows) {
      return out;
    }

    for (const row of rows) {
      if (!row || (restriction !== undefined && row.index !== restriction)) {
        continue;
      }

      for (const child of row.items || []) {
        child && out.push(child);
      }
    }

    return out;
  }

  addChild(
    state: DefPluginState<ToInternal<E>>,
    childNode: LayoutNode,
    _metadata: undefined,
    row: BaseRow | undefined,
  ): Partial<DefPluginState<ToInternal<E>>> {
    const rowIndex = childNode.rowIndex;
    if (rowIndex === undefined || rowIndex !== row?.index) {
      throw new Error(`Child node of repeating component missing 'rowIndex' property`);
    }
    const item = state.item;
    const rows = (item && this.settings.internalProp in item ? [...item[this.settings.internalProp]] : []) as Row<E>[];
    const items = [...(rows[rowIndex]?.items || [])];
    items.push(childNode);

    rows[rowIndex] = { ...(rows[rowIndex] || {}), ...row, items };

    return {
      item: {
        ...state.item,
        [this.settings.internalProp]: rows,
        [this.settings.externalProp]: undefined,
      },
    } as Partial<DefPluginState<ToInternal<E>>>;
  }

  removeChild(
    state: DefPluginState<ToInternal<E>>,
    childNode: LayoutNode,
    _metadata: undefined,
    row: BaseRow | undefined,
  ): Partial<DefPluginState<ToInternal<E>>> {
    const rowIndex = childNode.rowIndex;
    if (rowIndex === undefined || rowIndex !== row?.index) {
      throw new Error(`Child node of repeating component missing 'rowIndex' property`);
    }
    const item = state.item;
    const rows = (item && this.settings.internalProp in item ? [...item[this.settings.internalProp]] : []) as Row<E>[];
    const items = [...(rows[rowIndex]?.items || [])];
    const idx = items.findIndex((item) => item === childNode);
    if (idx < 0) {
      return {};
    }
    items.splice(idx, 1);

    rows[rowIndex] = { ...(rows[rowIndex] || {}), ...row, items };

    return {
      item: {
        ...state.item,
        [this.settings.internalProp]: rows,
        [this.settings.externalProp]: undefined,
      },
    } as Partial<DefPluginState<ToInternal<E>>>;
  }

  isChildHidden(_state: DefPluginState<ToInternal<E>>, _childNode: LayoutNode): boolean {
    // Repeating children plugins do not have any specific logic here, but beware that
    // the RepeatingGroup component does.
    return false;
  }
}

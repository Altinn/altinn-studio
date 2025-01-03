import dot from 'dot-object';

import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import type { TypesFromCategory } from 'src/layout/layout';
import type { ChildIdMutator } from 'src/utils/layout/generator/GeneratorContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodesContext } from 'src/utils/layout/NodesContext';
import type {
  DefPluginChildClaimerProps,
  DefPluginCompExternal,
  DefPluginExtraInItem,
  DefPluginState,
  DefPluginStateFactoryProps,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';
import type { BaseRow } from 'src/utils/layout/types';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

export interface RepChildrenRow extends BaseRow {
  itemIds: string[];
}

export interface RepChildrenInternalState {
  lastMultiPageIndex?: number;
  rawChildren: string[];
  idMutators: ChildIdMutator[];
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
  } & { internal: RepChildrenInternalState };
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

export class RepeatingChildrenPlugin<E extends ExternalConfig = typeof defaultConfig>
  extends NodeDefPlugin<ToInternal<E>>
  implements NodeDefChildrenPlugin<ToInternal<E>>
{
  public settings: Combined<E>;

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
    return ['RepeatingChildrenPlugin', this.settings.externalProp].join('/');
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
    return `
      <${NodeRepeatingChildren} claims={props.childClaims} plugin={this.plugins['${this.getKey()}'] as any} />
    `.trim();
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

  private usesMultiPage(item: DefPluginCompExternal<ToInternal<E>>): boolean {
    return this.settings.multiPageSupport !== false && dot.pick(this.settings.multiPageSupport, item) === true;
  }

  itemFactory({ item, idMutators }: DefPluginStateFactoryProps<ToInternal<E>>): DefPluginExtraInItem<ToInternal<E>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawChildren = ((item as any)[this.settings.externalProp] ?? []) as string[];

    const multiPage = this.usesMultiPage(item as DefPluginCompExternal<ToInternal<E>>);
    let lastMultiPageIndex: number | undefined = undefined;
    if (multiPage) {
      lastMultiPageIndex = 0;
      for (const id of rawChildren) {
        const [pageIndex] = id.split(':', 2);
        lastMultiPageIndex = Math.max(lastMultiPageIndex, parseInt(pageIndex, 10));
      }
    }

    return {
      [this.settings.externalProp]: undefined,
      [this.settings.internalProp]: [],
      internal: { lastMultiPageIndex, rawChildren, idMutators },
    } as DefPluginExtraInItem<ToInternal<E>>;
  }

  addRowProps(internal: RepChildrenInternalState | undefined, rowIndex: number): Partial<RepChildrenRow> {
    if (!internal) {
      return {};
    }

    const children = internal.rawChildren
      .map((childId) => {
        if (internal.lastMultiPageIndex !== undefined) {
          const [, cleanId] = childId.split(':', 2);
          return cleanId;
        }
        return childId;
      })
      .map((childId) => internal.idMutators.reduce((id, mutator) => mutator(id), childId))
      .map((id) => `${id}-${rowIndex}`);

    return { itemIds: children };
  }

  claimChildren({ claimChild, item }: DefPluginChildClaimerProps<ToInternal<E>>): void {
    const multiPage = this.usesMultiPage(item);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const id of (item as any)[this.settings.externalProp]) {
      if (multiPage) {
        if (!/^\d+:[^:]+$/u.test(id)) {
          throw new Error(
            `Ved bruk av multiPage må ID være på formatet 'sideIndeks:komponentId' (f.eks. '0:komponentId'). Referansen '${id}' er ikke gyldig.`,
          );
        }

        const [, childId] = id.split(':', 2);
        claimChild(childId);
      } else {
        claimChild(id);
      }
    }
  }

  pickDirectChildren(state: DefPluginState<ToInternal<E>>, restriction?: TraversalRestriction): string[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (state.item as any)[this.settings.internalProp] as (Row<E> | undefined)[];
    if (!rows) {
      return emptyArray;
    }

    if (restriction !== undefined) {
      return rows[restriction]?.itemIds ?? emptyArray;
    }

    const out: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      row?.itemIds && out.push(...row.itemIds);
    }
    return out;
  }

  isChildHidden(_state: DefPluginState<ToInternal<E>>, _childNode: LayoutNode): boolean {
    // Repeating children plugins do not have any specific logic here, but beware that
    // the RepeatingGroup component does.
    return false;
  }

  stateIsReady(state: DefPluginState<ToInternal<E>>, fullState: NodesContext): boolean {
    if (!super.stateIsReady(state, fullState)) {
      return false;
    }

    const internalProp = this.settings.internalProp;
    const rows = state.item?.[internalProp] as Row<E>[] | undefined;
    return rows?.every((row) => row && row.uuid !== undefined && row.itemIds !== undefined) ?? false;
  }
}

const emptyArray = [];

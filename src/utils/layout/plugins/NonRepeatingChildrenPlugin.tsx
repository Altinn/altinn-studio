import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { CompCapabilities } from 'src/codegen/Config';
import type { TypesFromCategory } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  DefPluginChildClaimerProps,
  DefPluginExtraInItem,
  DefPluginState,
  DefPluginStateFactoryProps,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

interface ClaimMetadata {
  idx: number;
}

interface Config<
  Type extends TypesFromCategory<CompCategory.Container>,
  ExternalProp extends string,
  InternalProp extends string,
> {
  componentType: Type;
  settings: Required<Pick<ExternalConfig, 'title' | 'description'>>;
  childClaimMetadata: ClaimMetadata;
  expectedFromExternal: {
    [key in ExternalProp]: string[];
  };
  extraState: undefined;
  extraInItem: { [key in ExternalProp]: undefined } & { [key in InternalProp]: LayoutNode[] };
}

interface ExternalConfig {
  componentType?: TypesFromCategory<CompCategory.Container>;
  externalProp?: string;
  internalProp?: string;
  title?: string;
  description?: string;
  onlyWithCapability?: keyof CompCapabilities;
}

const defaultConfig = {
  componentType: 'unknown' as TypesFromCategory<CompCategory.Container>,
  externalProp: 'children' as const,
  internalProp: 'childComponents' as const,
  title: 'Children',
  description: 'List of child component IDs to show inside',
};

type Combined<E extends ExternalConfig> = typeof defaultConfig & E;
type ToInternal<E extends ExternalConfig> = Config<
  Combined<E>['componentType'],
  Combined<E>['externalProp'],
  Combined<E>['internalProp']
>;

export class NonRepeatingChildrenPlugin<E extends ExternalConfig>
  extends NodeDefPlugin<ToInternal<E>>
  implements NodeDefChildrenPlugin<ToInternal<E>>
{
  protected settings: Combined<E>;
  protected component: ComponentConfig | undefined;
  constructor(settings: E) {
    super({
      ...defaultConfig,
      ...settings,
      componentType: 'unknown' as TypesFromCategory<CompCategory.Container>,
    } as Combined<E>);
  }

  makeImport() {
    return new CG.import({
      import: 'NonRepeatingChildrenPlugin',
      from: 'src/utils/layout/plugins/NonRepeatingChildrenPlugin',
    });
  }

  getKey(): string {
    return [this.constructor.name, this.settings.externalProp].join('/');
  }

  makeConstructorArgs(asGenericArgs = false): string {
    if (!this.component) {
      throw new Error('Component not set, cannot make constructor args for plugin not attached to a component');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.settings.componentType = this.component.type as any;
    return this.makeConstructorArgsWithoutDefaultSettings(defaultConfig, asGenericArgs);
  }

  addToComponent(component: ComponentConfig): void {
    this.component = component;
    if (component.config.category !== CompCategory.Container) {
      throw new Error('NonRepeatingChildrenPlugin can only be used with container components');
    }
    component.addProperty(
      new CG.prop(
        this.settings.externalProp,
        new CG.arr(new CG.str()).setTitle(this.settings.title).setDescription(this.settings.description),
      ),
    );
  }

  extraNodeGeneratorChildren(): string {
    const GenerateNodeChildren = new CG.import({
      import: 'GenerateNodeChildren',
      from: 'src/utils/layout/generator/LayoutSetGenerator',
    });
    return `<${GenerateNodeChildren} claims={props.childClaims} pluginKey='${this.getKey()}' />`;
  }

  itemFactory(_props: DefPluginStateFactoryProps<ToInternal<E>>) {
    // Components with children may also have _zero_ children, but the internal prop has to contain an array still.
    return {
      [this.settings.externalProp]: undefined,
      [this.settings.internalProp]: [],
    } as DefPluginExtraInItem<ToInternal<E>>;
  }

  claimChildren({ item, claimChild, getProto }: DefPluginChildClaimerProps<ToInternal<E>>): void {
    for (const [idx, id] of item[this.settings.externalProp].entries()) {
      if (this.settings.onlyWithCapability) {
        const proto = getProto(id);
        if (!proto) {
          continue;
        }
        if (!proto.capabilities[this.settings.onlyWithCapability]) {
          window.logWarn(
            `${this.settings.componentType} component included a component '${id}', which ` +
              `is a '${proto.type}' and cannot be rendered in an ${this.settings.componentType}.`,
          );
          continue;
        }
      }
      claimChild(id, { idx });
    }
  }

  pickDirectChildren(state: DefPluginState<ToInternal<E>>, restriction?: TraversalRestriction): LayoutNode[] {
    if (restriction !== undefined) {
      return [];
    }

    return state.item?.[this.settings.internalProp] || [];
  }

  addChild(
    state: DefPluginState<ToInternal<E>>,
    childNode: LayoutNode,
    metadata: ClaimMetadata,
  ): Partial<DefPluginState<ToInternal<E>>> {
    const newState: (LayoutNode | undefined)[] = [...(state.item?.[this.settings.internalProp] ?? [])];
    newState[metadata.idx] = childNode;
    const overwriteLayout = { [this.settings.externalProp]: undefined };
    return {
      item: { ...state.item, [this.settings.internalProp]: newState, ...overwriteLayout },
    } as unknown as Partial<DefPluginState<ToInternal<E>>>;
  }

  removeChild(
    state: DefPluginState<ToInternal<E>>,
    _childNode: LayoutNode,
    metadata: ClaimMetadata,
  ): Partial<DefPluginState<ToInternal<E>>> {
    const newState: (LayoutNode | undefined)[] = [...(state.item?.[this.settings.internalProp] ?? [])];
    newState[metadata.idx] = undefined;
    const overwriteLayout = { [this.settings.externalProp]: undefined };
    return {
      item: { ...state.item, [this.settings.internalProp]: newState, ...overwriteLayout },
    } as unknown as Partial<DefPluginState<ToInternal<E>>>;
  }

  isChildHidden(_state: DefPluginState<ToInternal<E>>, _childNode: LayoutNode): boolean {
    return false;
  }
}

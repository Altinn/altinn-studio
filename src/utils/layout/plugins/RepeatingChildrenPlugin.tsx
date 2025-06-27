import dot from 'dot-object';

import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { TypesFromCategory } from 'src/layout/layout';
import type {
  DefPluginChildClaimerProps,
  DefPluginCompExternal,
  DefPluginState,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';

interface Config<T extends TypesFromCategory<CompCategory.Container>> {
  componentType: T;
  settings: Required<Pick<ExternalConfig, 'title' | 'description'>>;
  expectedFromExternal: {
    children: string[];
  };
}

interface ExternalConfig {
  componentType?: TypesFromCategory<CompCategory.Container>;
  dataModelGroupBinding?: string;
  multiPageSupport?: false | string; // Path to property that indicates if multi-page support is enabled
  title?: string;
  description?: string;
}

const defaultConfig = {
  componentType: 'unknown' as TypesFromCategory<CompCategory.Container>,
  dataModelGroupBinding: 'group' as const,
  multiPageSupport: false as const,
  title: 'Children',
  description:
    'List of child component IDs to show inside (will be repeated according to the number of rows in the data model binding)',
};

type ConfigOrDefault<C, D> = D & C extends never ? C : D & C;
type Combined<E extends ExternalConfig> = {
  [key in keyof Required<ExternalConfig>]: Exclude<ConfigOrDefault<E[key], (typeof defaultConfig)[key]>, undefined>;
};
type Setting<E extends ExternalConfig, P extends keyof ExternalConfig> = Combined<E>[P];
type ToInternal<E extends ExternalConfig> = Config<Setting<E, 'componentType'>>;

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
    return 'RepeatingChildrenPlugin';
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
        'children',
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

  private usesMultiPage(item: DefPluginCompExternal<ToInternal<E>>): boolean {
    return this.settings.multiPageSupport !== false && dot.pick(this.settings.multiPageSupport, item) === true;
  }

  claimChildren({ claimChild, item }: DefPluginChildClaimerProps<ToInternal<E>>): void {
    const multiPage = this.usesMultiPage(item);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const id of (item as any).children) {
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

  isChildHidden(_state: DefPluginState<ToInternal<E>>, _childId: string, _lookups: LayoutLookups): boolean {
    // Repeating children plugins do not have any specific logic here, but beware that
    // the RepeatingGroup component does.
    return false;
  }
}

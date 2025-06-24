import { CG } from 'src/codegen/CG';
import { CompCategory } from 'src/layout/common';
import { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { GridRows } from 'src/layout/common.generated';
import type { CompTypes, TypesFromCategory } from 'src/layout/layout';
import type {
  DefPluginChildClaimerProps,
  DefPluginState,
  NodeDefChildrenPlugin,
} from 'src/utils/layout/plugins/NodeDefPlugin';

interface ExternalConfig {
  componentType?: TypesFromCategory<CompCategory.Container>;
  externalProp?: string;
  optional?: boolean;
}

interface Config<Type extends CompTypes, ExternalProp extends string> {
  componentType: Type;
  expectedFromExternal: {
    [key in ExternalProp]?: GridRows;
  };
  extraState: undefined;
}

const defaultConfig = {
  componentType: 'unknown' as TypesFromCategory<CompCategory.Container>,
  externalProp: 'rows' as const,
  optional: false as const,
};

type ConfigOrDefault<C, D> = D & C extends never ? C : D & C;
type Combined<E extends ExternalConfig> = {
  [key in keyof Required<ExternalConfig>]: Exclude<ConfigOrDefault<E[key], (typeof defaultConfig)[key]>, undefined>;
};
type Setting<E extends ExternalConfig, P extends keyof ExternalConfig> = Combined<E>[P];

type ToInternal<E extends ExternalConfig> = Config<Setting<E, 'componentType'>, Setting<E, 'externalProp'>>;

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
    return ['GridRowsPlugin', this.settings.externalProp].join('/');
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

  claimChildren({ item, claimChild, getType, getCapabilities }: DefPluginChildClaimerProps<ToInternal<E>>): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (item as any)[this.settings.externalProp] as GridRows | undefined;
    if (!rows) {
      return;
    }

    for (const row of rows.values()) {
      for (const cell of row.cells.values()) {
        if (cell && 'component' in cell && cell.component) {
          const type = getType(cell.component);
          if (!type) {
            continue;
          }
          const capabilities = getCapabilities(type);
          if (!capabilities.renderInTable) {
            window.logWarn(
              `Grid-like component included a component '${cell.component}', which ` +
                `is a '${type}' and cannot be rendered in a table.`,
            );
            continue;
          }
          claimChild(cell.component);
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

  isChildHidden(_state: DefPluginState<ToInternal<E>>, _childId: string): boolean {
    // There are no specific rules for hiding components in a Grid (yet). This should be implemented if we
    // add support for hiding a row or a cell (which should also hide the component inside)
    return false;
  }
}

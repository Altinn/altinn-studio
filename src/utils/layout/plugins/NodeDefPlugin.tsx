import { CG } from 'src/codegen/CG';
import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import type { SerializableSetting } from 'src/codegen/SerializableSetting';
import type { CompInternal, CompTypes } from 'src/layout/layout';
import type { ChildClaimerProps, ExprResolver } from 'src/layout/LayoutComponent';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { BaseNodeData, BaseRow, StateFactoryProps } from 'src/utils/layout/types';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

export interface DefPluginConfig {
  componentType: CompTypes;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectedFromExternal?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraState?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraInItem?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  childClaimMetadata?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings?: any;
}

interface DefPluginBaseNodeData<Config extends DefPluginConfig>
  extends Omit<BaseNodeData<DefPluginCompType<Config>>, 'layout' | 'item'> {
  item: (DefPluginCompInternal<Config> & DefPluginExtraInItem<Config>) | undefined;
  layout: DefPluginCompExternal<Config>;
}

// If the key 'extraInItem' exists in the plugin config, return the type of that key,
// otherwise return 'undefined'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DefPluginExtraInItemFromPlugin<Plugin extends NodeDefPlugin<any>> =
  Plugin extends NodeDefPlugin<infer Config>
    ? DefPluginExtraInItem<Config> extends object
      ? DefPluginExtraInItem<Config>
      : Record<string, never>
    : never;

export type DefPluginClaimMetadata<Config extends DefPluginConfig> = Config['childClaimMetadata'];
export type DefPluginCompType<Config extends DefPluginConfig> = Config['componentType'];
export type DefPluginExtraState<Config extends DefPluginConfig> = Config['extraState'] extends undefined
  ? unknown
  : Config['extraState'];
export type DefPluginExtraInItem<Config extends DefPluginConfig> = Config['extraInItem'];
export type DefPluginCompInternal<Config extends DefPluginConfig> = CompInternal<DefPluginCompType<Config>>;
export type DefPluginState<Config extends DefPluginConfig> = DefPluginBaseNodeData<Config> &
  DefPluginExtraState<Config>;
export type DefPluginStateFactoryProps<Config extends DefPluginConfig> = StateFactoryProps<DefPluginCompType<Config>>;
export type DefPluginExprResolver<Config extends DefPluginConfig> = Omit<
  ExprResolver<DefPluginCompType<Config>>,
  'item'
> & {
  item: DefPluginCompExternal<Config>;
};
export type DefPluginCompExternal<Config extends DefPluginConfig> = Config['expectedFromExternal'];
export type DefPluginChildClaimerProps<Config extends DefPluginConfig> = Omit<
  ChildClaimerProps<DefPluginCompType<Config>, DefPluginClaimMetadata<Config>>,
  'claimChild'
> & {
  item: DefPluginCompExternal<Config>;
  claimChild(childId: string, metadata: DefPluginClaimMetadata<Config>): void;
};
export type DefPluginSettings<Config extends DefPluginConfig> = Config['settings'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConfigFromDefPlugin<C extends NodeDefPlugin<any>> = C extends NodeDefPlugin<infer Config> ? Config : never;

/**
 * A node state plugin work when generating code for a component. Adding such a plugin to your component
 * will extend the functionality of the component storage. The output of these functions will be added to the
 * generated code for the component.
 */
export abstract class NodeDefPlugin<Config extends DefPluginConfig> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public import: GenerateImportedSymbol<any>;

  public constructor(protected settings?: Config['settings']) {
    this.import = this.makeImport();
  }

  /**
   * This makes sure the code generator can use ${plugin} in string templates to automatically import the correct
   * symbol in the target file.
   */
  public toString() {
    return this.import.toString();
  }

  /**
   * Makes the import object. This will run on instantiation of the plugin.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract makeImport(): GenerateImportedSymbol<any>;

  /**
   * Adds the plugin to the component. This can be used to verify that the target component is valid and can include
   * the plugin, and/or add custom properties to the component that is needed for this plugin to work.
   */
  abstract addToComponent(component: ComponentConfig): void;

  /**
   * Makes a key that keeps this plugin unique. This is used to make sure that if we're adding the same plugin
   * multiple times to the same component, only uniquely configured plugins are added.
   */
  getKey(): string {
    // By default, no duplicate plugins of the same type are allowed.
    return this.constructor.name;
  }

  /**
   * Makes constructor arguments (must be a string, most often JSON). This is used to add custom constructor arguments
   * when instantiating this plugin in code generation.
   */
  makeConstructorArgs(asGenericArgs = false): string {
    if (this.settings) {
      return this.serializeSettings(this.settings, asGenericArgs);
    }
    return '';
  }

  /**
   * Useful tool when you have the concept of 'default' settings in your plugin. This will make the constructor
   * arguments, but omits any settings that are the same as the default settings.
   */
  protected makeConstructorArgsWithoutDefaultSettings(defaults: unknown, asGenericArgs: boolean): string {
    const settings = this.settings;
    if (settings && typeof settings === 'object' && defaults && typeof defaults === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nonDefaultSettings: any = Object.keys(settings)
        .filter((key) => settings[key] !== defaults[key])
        .reduce((acc, key) => {
          acc[key] = settings[key];
          return acc;
        }, {});

      return this.serializeSettings(nonDefaultSettings, asGenericArgs);
    }

    throw new Error('Settings must be an object');
  }

  protected serializeSettings(settings: unknown, asGenericArgs: boolean) {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings must be an object');
    }

    const lines: string[] = [];
    for (const _key of Object.keys(settings)) {
      const value = settings[_key];
      const key = asGenericArgs ? _key : JSON.stringify(_key);

      // If value is a class object, check if it has the 'serializeSetting' method, i.e. that it implements the
      // SerializableSetting interface
      if (
        value &&
        typeof value === 'object' &&
        typeof value.serializeToTypeDefinition === 'function' &&
        typeof value.serializeToTypeScript === 'function'
      ) {
        const valueAsInstance = value as SerializableSetting;
        const result = asGenericArgs
          ? valueAsInstance.serializeToTypeDefinition()
          : valueAsInstance.serializeToTypeScript();
        lines.push(`${key}: ${result}`);
        continue;
      }

      // All other non-primitives are prohibited
      if (value && typeof value === 'object') {
        throw new Error(`Settings object contains non-serializable value: ${_key}`);
      }

      const valueJson = JSON.stringify(value);
      const constValue = asGenericArgs ? valueJson : `${valueJson} as const`;
      lines.push(`${key}: ${constValue}`);
    }

    return `{${lines.join(',')}}`;
  }

  /**
   * Makes generic arguments (YourClass<THIS THING HERE>) for the plugin. This is used to list the component plugin
   * configurations for components.
   */
  makeGenericArgs(): string {
    return this.makeConstructorArgs(true);
  }

  /**
   * Adds state factory properties to the component. This is called when creating the state for the component for the
   * first time.
   */
  stateFactory(_props: DefPluginStateFactoryProps<Config>): DefPluginExtraState<Config> {
    return {} as DefPluginExtraState<Config>;
  }

  /**
   * Returns initial state for the item object. This may be needed if your plugin has to initialize the item object
   * with some state, and stateFactory() won't work properly since multiple plugins will overwrite each others item
   * object.
   */
  itemFactory(_props: DefPluginStateFactoryProps<Config>): DefPluginExtraInItem<Config> {
    return {} as DefPluginExtraInItem<Config>;
  }

  /**
   * Evaluates some expressions for the component. This can be used to add custom expressions to the component.
   */
  evalDefaultExpressions(_props: DefPluginExprResolver<Config>): DefPluginExtraInItem<Config> {
    return {} as DefPluginExtraInItem<Config>;
  }

  /**
   * Outputs the code to render any child components that are needed for this plugin to work.
   * The reason this expects a string instead of JSX is because the code generator will run this function
   * and insert the output into the generated code. If we just output a reference to this function, the code
   * generator would have to load our entire application to run this function, which would inevitably lead to
   * circular dependencies and import errors (i.e. trying to import CSS into a CLI tool).
   */
  extraNodeGeneratorChildren(): string {
    return '';
  }

  /**
   * Outputs any extra method definitions the component Def class needs to have. This can be used to add custom
   * methods to the component, or force the component to implement certain methods (by making them abstract).
   */
  extraMethodsInDef(): string[] {
    return [];
  }

  /**
   * Outputs any extra code that should be output in the evalExpressions method. If you implement
   * evalDefaultExpressions(). This aids in indicating extra state that is placed in the item object by your
   * plugin (such as state added by addChild(), etc).
   */
  extraInEvalExpressions(): string {
    const implementsExpressions = this.evalDefaultExpressions !== NodeDefPlugin.prototype.evalDefaultExpressions;
    if (implementsExpressions) {
      return `...this.plugins['${this.getKey()}'].evalDefaultExpressions(props as any),`;
    }

    const DefPluginExtraInItemFromPlugin = new CG.import({
      import: 'DefPluginExtraInItemFromPlugin',
      from: 'src/utils/layout/plugins/NodeDefPlugin',
    });

    // Fakes the state to make sure inferred types catch our additions to the state (even if the state is created
    // somewhere else).
    return `...({} as ${DefPluginExtraInItemFromPlugin}<(typeof this.plugins)['${this.getKey()}']>),`;
  }
}

/**
 * Implement this interface if your plugin/component needs to support children in some form.
 */
export interface NodeDefChildrenPlugin<Config extends DefPluginConfig> {
  claimChildren(props: DefPluginChildClaimerProps<Config>): void;
  pickDirectChildren(state: DefPluginState<Config>, restriction?: TraversalRestriction): LayoutNode[];
  addChild(
    state: DefPluginState<Config>,
    childNode: LayoutNode,
    metadata: DefPluginClaimMetadata<Config>,
    row: BaseRow | undefined,
  ): Partial<DefPluginState<Config>>;
  removeChild(
    state: DefPluginState<Config>,
    childNode: LayoutNode,
    metadata: DefPluginClaimMetadata<Config>,
    row: BaseRow | undefined,
  ): Partial<DefPluginState<Config>>;
  isChildHidden(state: DefPluginState<Config>, childNode: LayoutNode): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isNodeDefChildrenPlugin(plugin: unknown): plugin is NodeDefChildrenPlugin<any> {
  return (
    !!plugin &&
    typeof plugin === 'object' &&
    'claimChildren' in plugin &&
    'pickDirectChildren' in plugin &&
    'addChild' in plugin &&
    'removeChild' in plugin &&
    typeof plugin.claimChildren === 'function' &&
    typeof plugin.pickDirectChildren === 'function' &&
    typeof plugin.addChild === 'function' &&
    typeof plugin.removeChild === 'function'
  );
}

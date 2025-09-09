import type { ComponentConfig } from 'src/codegen/ComponentConfig';
import type { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import type { SerializableSetting } from 'src/codegen/SerializableSetting';
import type { CompTypes } from 'src/layout/layout';
import type { StateFactoryProps } from 'src/utils/layout/types';

interface DefPluginConfig {
  componentType: CompTypes;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expectedFromExternal?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraState?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extraInItem?: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings?: any;
}

export type DefPluginExtraState<Config extends DefPluginConfig> = Config['extraState'] extends undefined
  ? unknown
  : Config['extraState'];
export type DefPluginStateFactoryProps = StateFactoryProps;

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
  abstract getKey(): string;

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
  stateFactory(_props: DefPluginStateFactoryProps): DefPluginExtraState<Config> {
    return {} as DefPluginExtraState<Config>;
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
}

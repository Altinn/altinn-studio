import { ConfigFile } from './ConfigFile';
import { unsupportedLayoutComponents } from './unsupported';
import { ConfigurableItem } from './ConfigurableItem';
import { unsupportedComponentProperties } from './unsupported';

/**
 * Class representing layout configuration file stats
 */
export class Layout extends ConfigFile {
  constructor(layoutSchema: any) {
    super(layoutSchema, unsupportedLayoutComponents);
    this.items = this.getAllComponentNames(layoutSchema).map((name: string) => {
      return new Component(name, layoutSchema, this.unsupportedItems.includes(name));
    });
  }

  private getAllComponentNames = (schema: any) => {
    const componentsFromSchema: string[] = schema.definitions.AnyComponent.properties.type.enum;
    const additionalComponents = [
      'GroupRepeating',
      'GroupNonRepeating',
      'GroupNonRepeatingPanel',
      'GroupRepeatingLikert',
    ];
    componentsFromSchema.splice(componentsFromSchema.indexOf('Group'), 1, ...additionalComponents);
    return componentsFromSchema;
  };
}

export class Component extends ConfigurableItem {
  constructor(name: string, layoutSchema: any, unsupported: boolean = false) {
    const schema = layoutSchema.definitions[`Comp${name.replace('Component', '')}`];
    super(name, schema, unsupportedComponentProperties, unsupported);
    this.properties = this.getProperties(schema);
  }

  /**
   * Exploiting the fact that the last entry in the allOf array from the layout
   * component schema contains all of the component properties.
   * @param componentSchema
   * @returns An array of the component property names
   */
  getProperties = (componentSchema: any) => {
    const allOfLength = componentSchema.allOf.length;
    return Object.keys(componentSchema.allOf[allOfLength - 1].properties);
  };
}

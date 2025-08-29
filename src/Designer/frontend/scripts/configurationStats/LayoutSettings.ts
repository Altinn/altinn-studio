import { ConfigFile } from './ConfigFile';
import { ConfigurableItem } from './ConfigurableItem';
import { unsupportedLayoutSettingsProperties } from './unsupported';

/**
 * Class representing layout settings configuration file stats
 */
export class LayoutSettings extends ConfigFile {
  constructor(schema: any, unsupportedItems?: string[]) {
    super(schema, unsupportedItems);
    this.items = Object.keys(schema.properties).map((name: string) => {
      return new SettingsItem(name, schema);
    });
  }
}

class SettingsItem extends ConfigurableItem {
  constructor(name: string, schema: any) {
    super(name, schema, unsupportedLayoutSettingsProperties);
    this.properties = this.getProperties(schema);
  }

  /**
   * Properties for layoutSettings are defined in the definitions object
   * @param schema
   * @returns
   */
  getProperties = (schema: any) => {
    return Object.keys(schema.definitions[this.name].properties);
  };
}

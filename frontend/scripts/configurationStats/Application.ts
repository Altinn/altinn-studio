import { ConfigFile } from './ConfigFile';
import { ConfigurableItem } from './ConfigurableItem';
import { unsupportedApplicationMetadataProperties } from './unsupported';

/**
 * Class representing the application metadata configuration file stats
 */
export class Application extends ConfigFile {
  constructor(schema: any, unsupportedItems?: string[]) {
    super(schema, unsupportedItems);
    this.items = [new ApplicationItem('ApplicationMetadata', schema)];
  }
}

class ApplicationItem extends ConfigurableItem {
  constructor(name: string, schema: any) {
    super(name, schema, unsupportedApplicationMetadataProperties);
    this.properties = this.getProperties(schema);
  }

  /**
   * Application metadata properties are on the root of the schema
   * @param schema
   * @returns An array of the application metadata property names
   */
  getProperties = (schema: any) => {
    return Object.keys(schema.properties);
  };
}

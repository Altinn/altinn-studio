import { JsonSchema } from 'app-shared/types/JsonSchema';

/**
 * Represents a configurable item in a configuration file.
 */
export abstract class ConfigurableItem {
  schema: JsonSchema;
  name: string;
  properties: string[];
  unsupportedProperties: string[];
  private _percentageSupportedProperties: number;
  isUnsupported: boolean;

  constructor(
    name: string,
    schema: JsonSchema,
    unsupportedProperties: string[],
    unsupported: boolean = false,
  ) {
    this.name = name;
    this.schema = schema;
    this.unsupportedProperties = unsupportedProperties;
    this.isUnsupported = unsupported;
  }

  public setPercentageSupportedProperties = () => {
    if (this.isUnsupported) {
      this._percentageSupportedProperties = 0;
      return;
    }

    const propertyCount = this.properties.length;
    const unsupportedPropertyCount = this.properties.filter((property: string) =>
      this.unsupportedProperties.includes(property),
    ).length;
    this._percentageSupportedProperties = Math.round(
      ((propertyCount - unsupportedPropertyCount) / propertyCount) * 100,
    );
  };

  public getPercentageSupportedProperties = () => {
    return this._percentageSupportedProperties;
  };

  abstract getProperties(schema: JsonSchema): string[];
}

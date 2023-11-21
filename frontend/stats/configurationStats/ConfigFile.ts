import { JsonSchema } from 'app-shared/types/JsonSchema';
import { ConfigurableItem } from './ConfigurableItem';

export interface IConfigFile {
  schema: any;
  items: ConfigurableItem[];
  unsupportedItems: string[];
  calculateMeanPercentageSupportedProperties: () => number;
}

export abstract class ConfigFile implements IConfigFile {
  schema: JsonSchema;
  items: ConfigurableItem[];
  unsupportedItems: string[];

  constructor(schema: JsonSchema, unsupportedItems?: string[]) {
    this.schema = schema;
    this.unsupportedItems = unsupportedItems || [];
  }

  public calculateMeanPercentageSupportedProperties() {
    const itemCount = this.items.length;
    const totalPercentageSupportedProperties = this.items.reduce(
      (total: number, item: ConfigurableItem) => {
        item.setPercentageSupportedProperties();
        console.log(
          `${item.name}`,
          'supported property percentage:',
          item.getPercentageSupportedProperties(),
          '%',
        );
        return total + item.getPercentageSupportedProperties();
      },
      0,
    );
    return Math.round(totalPercentageSupportedProperties / itemCount);
  }
}

import type { JSONSchema7 } from 'json-schema';

import type { ComponentConfig } from 'src/codegen/ComponentConfig';

export interface SchemaFileProps {
  sortedKeys: string[];
  componentList: { [p: string]: string };
  configMap: { [key: string]: ComponentConfig };
}

export abstract class SchemaFile {
  protected sortedKeys: string[];
  protected componentList: { [p: string]: string };
  protected configMap: { [key: string]: ComponentConfig };

  constructor(props: SchemaFileProps) {
    this.sortedKeys = props.sortedKeys;
    this.componentList = props.componentList;
    this.configMap = props.configMap;
  }

  public abstract getFileName(): string;
  public abstract getSchema(): Promise<JSONSchema7>;

  public shouldCleanDefinitions(): boolean {
    return true;
  }
}

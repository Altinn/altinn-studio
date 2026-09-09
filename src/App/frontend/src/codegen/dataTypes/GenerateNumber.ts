import type { PropertyValueDefinition } from '@app/layout-contract';
import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator } from 'src/codegen/CodeGenerator';

/**
 * Generates a number value. I.e. a value that is always an integer or float.
 */
export class GenerateNumber extends DescribableCodeGenerator<number> {
  protected minimum?: number;
  protected maximum?: number;

  constructor() {
    super();
  }

  setMin(minimum: number) {
    this.ensureMutable();
    this.minimum = minimum;
    return this;
  }

  setMax(maximum: number) {
    this.ensureMutable();
    this.maximum = maximum;
    return this;
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    return symbol ? `type ${symbol} = number;` : 'number';
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    return {
      ...this.getInternalJsonSchema(),
      type: 'number',
      minimum: this.minimum,
      maximum: this.maximum,
    };
  }

  toComponentCatalogDefinition(): PropertyValueDefinition {
    return {
      type: 'number',
      ...(this.minimum !== undefined ? { minimum: this.minimum } : {}),
      ...(this.maximum !== undefined ? { maximum: this.maximum } : {}),
      ...this.componentCatalogMetadata(),
    };
  }
}

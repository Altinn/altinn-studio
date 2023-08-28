import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator } from 'src/codegen/CodeGenerator';
import type { CodeGenerator, Extract } from 'src/codegen/CodeGenerator';

export class GenerateIntersection<U extends CodeGenerator<any>[]> extends DescribableCodeGenerator<Extract<U[number]>> {
  private types: U;

  constructor(...types: U) {
    super();
    this.types = types;
  }

  containsVariationDifferences(): boolean {
    if (super.containsVariationDifferences()) {
      return true;
    }

    return this.types.some((type) => type.containsVariationDifferences());
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    return {
      ...this.getInternalJsonSchema(),
      allOf: this.types.map((type) => type.toJsonSchema()),
    };
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    const out = this.types.map((type) => type.toTypeScript()).join(' & ');

    return symbol ? `type ${symbol} = ${out};` : out;
  }
}

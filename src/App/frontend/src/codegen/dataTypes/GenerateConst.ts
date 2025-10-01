import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator } from 'src/codegen/CodeGenerator';

/**
 * Generates a constant value. I.e. a value that is always the given value.
 */
export class GenerateConst<Val extends string | boolean | number | null> extends DescribableCodeGenerator<Val> {
  constructor(public readonly value: Val) {
    super();
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    const out =
      typeof this.value === 'string'
        ? JSON.stringify(this.value)
        : typeof this.value === 'number'
          ? `${this.value}`
          : this.value === null
            ? `null`
            : `${this.value ? 'true' : 'false'}`;

    return symbol ? `type ${symbol} = ${out};` : out;
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    return {
      ...this.getInternalJsonSchema(),
      const: this.value,
    };
  }
}

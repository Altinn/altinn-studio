import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator } from 'src/codegen/CodeGenerator';
import type { CodeGenerator, Extract } from 'src/codegen/CodeGenerator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class GenerateIntersection<U extends CodeGenerator<any>[]> extends DescribableCodeGenerator<Extract<U[number]>> {
  private types: U;

  constructor(...types: U) {
    super();
    this.types = types;
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

import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator } from 'src/codegen/CodeGenerator';

/**
 * Generates a string value. It can have certain limitations, such as a pattern.
 * If you need a string that is always a certain value, use a const, union or enum instead.
 */
export class GenerateString extends DescribableCodeGenerator<string> {
  private pattern: RegExp | undefined;

  constructor() {
    super();
  }

  setPattern(pattern: RegExp): this {
    this.ensureMutable();
    this.pattern = pattern;
    return this;
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    return symbol ? `type ${symbol} = string;` : 'string';
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    return {
      ...this.getInternalJsonSchema(),
      type: 'string',
      pattern: this.pattern?.source,
    };
  }
}

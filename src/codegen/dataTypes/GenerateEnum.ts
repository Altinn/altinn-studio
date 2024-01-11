import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator } from 'src/codegen/CodeGenerator';

type ValueToNameFunc<T extends string | number> = (value: T) => string;

/**
 * Generates an enum type. In typescript this is a union of string literals (or a proper enum),
 * but in JsonSchema it is always an enum. The types you provide here must always be either strings or numbers, never
 * a mix. If you need a mix, or more complex choices, use a union type instead.
 */
export class GenerateEnum<T extends string | number> extends DescribableCodeGenerator<T> {
  public readonly values: T[];
  private _asRealEnum: false | ValueToNameFunc<T> = false;

  constructor(...values: T[]) {
    super();
    this.values = values;
  }

  asRealEnum(valueToName: ValueToNameFunc<T>): this {
    this.ensureMutable();
    this._asRealEnum = valueToName;
    return this;
  }

  private toRealTypeScriptEnum(valueToName: ValueToNameFunc<T>, symbol: string | undefined): string {
    return `enum ${symbol}{\n${this.values
      .map((value) => `  ${valueToName(value)} = ${JSON.stringify(value)},`)
      .join('\n')}\n}`;
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    return {
      ...this.getInternalJsonSchema(),
      enum: this.values,
    };
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    if (this._asRealEnum) {
      return this.toRealTypeScriptEnum(this._asRealEnum, symbol);
    }

    const out = this.values.map((value) => JSON.stringify(value)).join(' | ');

    return symbol ? `type ${symbol} = ${out};` : out;
  }

  shouldUseParens(): boolean {
    return this._asRealEnum === false;
  }
}

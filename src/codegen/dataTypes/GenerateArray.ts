import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator } from 'src/codegen/CodeGenerator';
import type { CodeGenerator, Extract } from 'src/codegen/CodeGenerator';

/**
 * Generates an array with inner items of the given type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class GenerateArray<Inner extends CodeGenerator<any>> extends DescribableCodeGenerator<Extract<Inner>[]> {
  private _minItems?: number;
  private _maxItems?: number;

  constructor(public readonly innerType: Inner) {
    super();
  }

  setMinItems(minItems: number): this {
    this.ensureMutable();
    this._minItems = minItems;
    return this;
  }

  setMaxItems(maxItems: number): this {
    this.ensureMutable();
    this._maxItems = maxItems;
    return this;
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    const out = this.innerType.shouldUseParens()
      ? `(${this.innerType.toTypeScript()})[]`
      : `${this.innerType.toTypeScript()}[]`;

    return symbol ? `type ${symbol} = ${out};` : out;
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    return {
      ...this.getInternalJsonSchema(),
      type: 'array',
      items: this.innerType.toJsonSchema(),
      minItems: this._minItems,
      maxItems: this._maxItems,
    };
  }
}

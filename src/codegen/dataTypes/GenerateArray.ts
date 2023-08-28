import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator } from 'src/codegen/CodeGenerator';
import { GenerateUnion } from 'src/codegen/dataTypes/GenerateUnion';
import type { Variant } from 'src/codegen/CG';
import type { CodeGenerator, Extract, MaybeSymbolizedCodeGenerator } from 'src/codegen/CodeGenerator';

/**
 * Generates an array with inner items of the given type
 */
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
    const out =
      this.innerType instanceof GenerateUnion
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

  transformTo(variant: Variant): this | MaybeSymbolizedCodeGenerator<any> {
    if (this.currentVariant === variant) {
      return this;
    }

    const out = new GenerateArray(this.innerType.transformTo(variant));
    out.internal = structuredClone(this.internal);
    out.internal.source = this;
    out.currentVariant = variant;

    return out;
  }

  containsVariationDifferences(): boolean {
    return super.containsVariationDifferences() || this.innerType.containsVariationDifferences();
  }
}

import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator, MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
import type { Variant } from 'src/codegen/CG';
import type { CodeGenerator, Extract, MaybeSymbolizedCodeGenerator } from 'src/codegen/CodeGenerator';

/**
 * Generates a union of multiple types. In typescript this is a regular union, and in JsonSchema it is an 'anyOf'.
 */
export class GenerateUnion<U extends CodeGenerator<any>[]> extends DescribableCodeGenerator<Extract<U[number]>> {
  private types: U;

  constructor(...types: U) {
    super();
    this.types = types;
  }

  addType(type: CodeGenerator<any>) {
    this.ensureMutable();
    this.types.push(type as any);
  }

  containsVariationDifferences(): boolean {
    if (super.containsVariationDifferences()) {
      return true;
    }

    return this.types.some((type) => type.containsVariationDifferences());
  }

  transformTo(variant: Variant): this | MaybeSymbolizedCodeGenerator<any> {
    if (this.currentVariant === variant) {
      return this;
    }

    const types = this.types.map((type) => type.transformTo(variant));
    const out = new GenerateUnion(...types);
    out.internal = structuredClone(this.internal);
    out.internal.source = this;
    out.currentVariant = variant;

    return out;
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    const out = this.types.map((type) => type.toTypeScript()).join(' | ');

    return symbol ? `type ${symbol} = ${out};` : out;
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    return {
      ...this.getInternalJsonSchema(),
      anyOf: this.types.map((type) => type.toJsonSchema()),
    };
  }

  isOptional(): boolean {
    return (
      super.isOptional() || this.types.some((type) => type instanceof MaybeOptionalCodeGenerator && type.isOptional())
    );
  }
}

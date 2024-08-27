import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator, MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
import type { CodeGenerator, Extract } from 'src/codegen/CodeGenerator';

/**
 * Generates a union of multiple types. In typescript this is a regular union, and in JsonSchema it is an 'anyOf'.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class GenerateUnion<U extends CodeGenerator<any>[]> extends DescribableCodeGenerator<Extract<U[number]>> {
  private types: U;

  constructor(...types: U) {
    super();
    this.types = types;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addType(type: CodeGenerator<any>) {
    this.ensureMutable();
    this.types.push(type);
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

  shouldUseParens(): boolean {
    return true;
  }
}

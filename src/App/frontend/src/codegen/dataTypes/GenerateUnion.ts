import deepEqual from 'fast-deep-equal';
import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator, MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
import type { CodeGenerator, Extract } from 'src/codegen/CodeGenerator';

type UnionType = 'any' | 'discriminated';
/**
 * Generates a union of multiple types. In typescript this is a regular union, and in JsonSchema it is an 'anyOf'.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class GenerateUnion<U extends CodeGenerator<any>[]> extends DescribableCodeGenerator<Extract<U[number]>> {
  private types: U;
  private unionType: UnionType = 'any';

  constructor(...types: U) {
    super();
    this.types = types;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addType(type: CodeGenerator<any>) {
    this.ensureMutable();
    this.types.push(type);
  }

  setUnionType(type: UnionType) {
    this.unionType = type;
    return this;
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    const list = this.types.map((type) => type.toTypeScript());
    const uniqueList = [...new Set(list)];
    const out = uniqueList.join(' | ');
    return symbol ? `type ${symbol} = ${out};` : out;
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    const schemaKey = this.unionType === 'discriminated' ? 'oneOf' : 'anyOf';
    const list = this.types.map((type) => type.toJsonSchema());
    const uniqueList: JSONSchema7[] = [];
    for (const curr of list) {
      if (!uniqueList.some((x) => deepEqual(x, curr))) {
        uniqueList.push(curr);
      }
    }
    return {
      ...this.getInternalJsonSchema(),
      [schemaKey]: uniqueList,
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

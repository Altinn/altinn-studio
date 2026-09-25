import deepEqual from 'fast-deep-equal';
import type { PropertyValueDefinition } from '@app/layout-contract';
import type { JSONSchema7 } from 'json-schema';

import { DescribableCodeGenerator, MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
import { GenerateExpressionOr } from 'src/codegen/dataTypes/GenerateExpressionOr';
import { ExprVal } from 'src/features/expressions/types';
import type { CodeGenerator, Extract } from 'src/codegen/CodeGenerator';
import type { ExpressionDescriptorEntry } from 'src/codegen/ExpressionDescriptors';

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

  private expressionFallback?: Extract<U[number]>;

  /** Required unions accepting multiple expression return types need a runtime fallback. */
  setExpressionFallback(value: Extract<U[number]>): this {
    this.ensureMutable();
    this.expressionFallback = value;
    return this;
  }

  getExpressionFallback(): Extract<U[number]> | undefined {
    if (this.internal.optional && this.expressionFallback !== undefined) {
      throw new Error('An optional expression union cannot have an explicit fallback');
    }
    const fallback = this.internal.optional ? this.internal.optional.default : this.expressionFallback;
    if (!this.internal.optional && fallback === undefined) {
      throw new Error('An expression union needs a default in .optional() or an explicit required fallback');
    }
    return fallback;
  }

  getTypes(): readonly CodeGenerator<unknown>[] {
    return this.types;
  }

  expressionDescriptors(): ExpressionDescriptorEntry[] {
    const expressions = this.types.filter((type) => type instanceof GenerateExpressionOr);
    const others = this.types.filter((type) => !(type instanceof GenerateExpressionOr));
    const entries = others.flatMap((type) => type.expressionDescriptors());

    if (expressions.length > 1) {
      if (this.internal.optional) {
        expressions.forEach((expression) => expression.assertNoExplicitFallback());
      }
      entries.push({ path: [], returnType: ExprVal.Any, defaultValue: this.getExpressionFallback() });
    } else if (expressions.length === 1) {
      const expression = expressions[0];
      let defaultValue: unknown;
      if (this.internal.optional) {
        expression.assertNoExplicitFallback();
        defaultValue = this.getExpressionFallback();
        if (defaultValue === undefined && expression.internal.optional) {
          defaultValue = expression.internal.optional.default;
        }
      } else {
        defaultValue = expression.getExpressionFallback();
      }
      entries.push({ path: [], returnType: expression.valueType, defaultValue });
    }
    return entries;
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

  toComponentCatalogDefinition(): PropertyValueDefinition {
    return {
      type: 'union',
      variants: this.types.map((type) => type.toComponentCatalog()),
      ...this.componentCatalogMetadata(),
    };
  }
}

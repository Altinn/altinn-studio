import type { JSONSchema7 } from 'json-schema';

import { CG, VariantSuffixes } from 'src/codegen/CG';
import { MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
import { commonContainsVariationDifferences, getSourceForCommon } from 'src/codegen/Common';
import { GenerateObject } from 'src/codegen/dataTypes/GenerateObject';
import type { Variant } from 'src/codegen/CG';
import type { CodeGeneratorWithProperties } from 'src/codegen/CodeGenerator';
import type { ValidCommonKeys } from 'src/codegen/Common';
import type { GenerateProperty } from 'src/codegen/dataTypes/GenerateProperty';

/**
 * Generates an import statement for a common type (one of those defined in Common.ts).
 * In TypeScript, this is a regular import statement, and in JSON Schema, this is a reference to the definition.
 */
export class GenerateCommonImport<T extends ValidCommonKeys>
  extends MaybeOptionalCodeGenerator<any>
  implements CodeGeneratorWithProperties
{
  public readonly realKey?: string;

  constructor(
    public readonly key: T,
    realKey?: string,
  ) {
    super();
    this.realKey = realKey;
  }

  transformTo(variant: Variant): this | GenerateCommonImport<any> {
    if (this.currentVariant === variant) {
      return this;
    }

    if (commonContainsVariationDifferences(this.key)) {
      const out = new GenerateCommonImport(this.key, `${this.key}${VariantSuffixes[variant]}`);
      out.internal = structuredClone(this.internal);
      out.internal.source = this;
      out.currentVariant = variant;

      return out;
    }

    this.currentVariant = variant;
    return this;
  }

  toJsonSchema(): JSONSchema7 {
    this.freeze('toJsonSchema');
    return { $ref: `#/definitions/${this.key}` };
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    throw new Error('Should not be called');
  }

  hasProperty(name: string): boolean {
    const source = getSourceForCommon(this.key);
    if (source instanceof GenerateObject) {
      return source.hasProperty(name);
    }

    return false;
  }

  getProperty(name: string): GenerateProperty<any> | undefined {
    const source = getSourceForCommon(this.key);
    if (source instanceof GenerateObject) {
      return source.getProperty(name);
    }

    return undefined;
  }

  getProperties(): GenerateProperty<any>[] {
    const source = getSourceForCommon(this.key);
    if (source instanceof GenerateObject) {
      return source.getProperties();
    }

    return [];
  }

  toTypeScript(): string {
    return this.toTypeScriptDefinition();
  }

  toTypeScriptDefinition(): string {
    if (!this.currentVariant) {
      throw new Error('Cannot generate TypeScript definition for common import without variant');
    }

    const _import = new CG.import({
      import: this.realKey ?? this.key,
      from: 'src/layout/common.generated',
    });

    this.freeze('toTypeScriptDefinition');
    return _import.toTypeScriptDefinition(undefined);
  }

  containsVariationDifferences(): boolean {
    return super.containsVariationDifferences() || commonContainsVariationDifferences(this.key);
  }

  getName(respectVariationDifferences = true): string {
    if (!respectVariationDifferences) {
      return this.key;
    }
    return this.realKey ?? this.key;
  }
}

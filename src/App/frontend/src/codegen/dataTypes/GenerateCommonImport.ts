import type { PropertyValueDefinition } from '@app/layout-contract';
import type { JSONSchema7 } from 'json-schema';

import { CG } from 'src/codegen/CG';
import { type CodeGeneratorWithProperties, DescribableCodeGenerator } from 'src/codegen/CodeGenerator';
import { CodeGeneratorContext } from 'src/codegen/CodeGeneratorContext';
import { getSourceForCommon, isSerializedCommonType } from 'src/codegen/Common';
import { GenerateObject } from 'src/codegen/dataTypes/GenerateObject';
import type { ValidCommonKeys } from 'src/codegen/Common';
import type { GenerateProperty } from 'src/codegen/dataTypes/GenerateProperty';

/**
 * Generates an import statement for a common type (one of those defined in Common.ts).
 * In TypeScript, this is a regular import statement, and in JSON Schema, this is a reference to the definition.
 */
export class GenerateCommonImport<T extends ValidCommonKeys>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extends DescribableCodeGenerator<any>
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

  toJsonSchema(): JSONSchema7 {
    this.freeze('toJsonSchema');
    return {
      ...this.getInternalJsonSchema(),
      $ref: `#/definitions/${this.key}`,
    };
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProperty(name: string): GenerateProperty<any> | undefined {
    const source = getSourceForCommon(this.key);
    if (source instanceof GenerateObject) {
      return source.getProperty(name);
    }

    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const commonFile =
      CodeGeneratorContext.isGeneratingSerializedTypeScript() && isSerializedCommonType(this.key)
        ? 'serialized-common.generated'
        : 'common.generated';
    const _import = new CG.import({
      import: this.realKey ?? this.key,
      from: `@app/layout-contract/generated/${commonFile}`,
    });

    this.freeze('toTypeScriptDefinition');
    return _import.toTypeScriptDefinition(undefined);
  }

  toComponentCatalog(): PropertyValueDefinition {
    return {
      ...getSourceForCommon(this.key, 'JsonSchema').toComponentCatalog(),
      ...this.componentCatalogMetadata(),
    };
  }

  toComponentCatalogDefinition(): PropertyValueDefinition {
    return {
      ...getSourceForCommon(this.key, 'JsonSchema').toComponentCatalogDefinition(),
      ...this.componentCatalogMetadata(),
    };
  }

  getName(respectVariationDifferences = true): string {
    if (!respectVariationDifferences) {
      return this.key;
    }
    return this.realKey ?? this.key;
  }
}

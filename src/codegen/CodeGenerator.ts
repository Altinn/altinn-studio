import type { JSONSchema7, JSONSchema7Type } from 'json-schema';

import { Variant, VariantSuffixes } from 'src/codegen/CG';
import { CodeGeneratorContext } from 'src/codegen/CodeGeneratorContext';

export interface JsonSchemaExt<T> {
  title: string | undefined;
  description: string | undefined;
  examples: T[];
}

export interface TypeScriptExt {}

export interface SymbolExt {
  name: string;
  exported: boolean;
}

export interface Optionality<T> {
  default?: T;
  onlyIn?: Variant;
}

export interface InternalConfig<T> {
  jsonSchema: JsonSchemaExt<T>;
  typeScript: TypeScriptExt;
  symbol?: SymbolExt;
  optional: Optionality<T> | false;
  source?: CodeGenerator<any>;
  frozen: false | string;
}

export type Extract<Val extends CodeGenerator<any>> = Val extends CodeGenerator<infer X> ? X : never;

export abstract class CodeGenerator<T> {
  public currentVariant: Variant | undefined;
  public internal: InternalConfig<T> = {
    jsonSchema: {
      title: undefined,
      description: undefined,
      examples: [],
    },
    typeScript: {},
    optional: false,
    frozen: false,
  };

  protected getInternalJsonSchema(): JSONSchema7 {
    this.freeze('getInternalJsonSchema');
    return {
      title: this.internal.jsonSchema.title || this.internal.symbol?.name || undefined,
      description: this.internal.jsonSchema.description,
      examples: this.internal.jsonSchema.examples.length ? (this.internal.jsonSchema.examples as any) : undefined,
      default: this.internal.optional ? (this.internal.optional.default as JSONSchema7Type) : undefined,
    };
  }

  protected ensureMutable(): void {
    if (this.internal.frozen !== false) {
      throw new Error(`Cannot modify frozen code generator (was frozen by ${this.internal.frozen})`);
    }
  }

  protected freeze(source: string): void {
    this.internal.frozen = source;
  }

  transformTo(variant: Variant): this | CodeGenerator<any> {
    const isImplementedLocally =
      this.containsVariationDifferences === CodeGenerator.prototype.containsVariationDifferences ||
      this.containsVariationDifferences === MaybeOptionalCodeGenerator.prototype.containsVariationDifferences;
    if (!this.currentVariant && this.containsVariationDifferences() && !isImplementedLocally) {
      throw new Error(
        'You need to implement transformTo for this code generator, as it contains variation differences',
      );
    }

    this.currentVariant = variant;
    return this;
  }

  containsVariationDifferences(): boolean {
    return this.internal.source?.containsVariationDifferences() || false;
  }

  abstract toJsonSchema(): JSONSchema7;
  abstract toTypeScript(): string;
}

export abstract class MaybeSymbolizedCodeGenerator<T> extends CodeGenerator<T> {
  exportAs(name: string): this {
    this.ensureMutable();
    if (this.currentVariant) {
      throw new Error('You have to call exportAs() before calling transformTo()');
    }

    if (this.internal.symbol) {
      throw new Error('Cannot rename a symbolized code generator');
    }

    this.internal.symbol = {
      name,
      exported: true,
    };

    return this;
  }

  named(name: string): this {
    this.ensureMutable();
    if (this.currentVariant) {
      throw new Error('You have to call named() before calling transformTo()');
    }

    if (this.internal.symbol) {
      throw new Error('Cannot rename a symbolized code generator');
    }

    this.internal.symbol = {
      name,
      exported: false,
    };

    return this;
  }

  getName(respectVariationDifferences = true): string | undefined {
    if (!this.internal.symbol) {
      return undefined;
    }
    if (!this.currentVariant) {
      throw new Error('Cannot get name of symbolized code generator without variant - call transformTo() first');
    }
    if (respectVariationDifferences && this.containsVariationDifferences()) {
      return `${this.internal.symbol?.name}${VariantSuffixes[this.currentVariant]}`;
    }

    return this.internal.symbol?.name;
  }

  private shouldBeExported(): boolean {
    return this.internal.symbol?.exported ?? false;
  }

  transformTo(variant: Variant): this | MaybeSymbolizedCodeGenerator<any> {
    return super.transformTo(variant) as this | MaybeSymbolizedCodeGenerator<any>;
  }

  toTypeScript(): string {
    this.freeze('toTypeScript');
    if (!this.currentVariant) {
      throw new Error('You need to transform this type to either external or internal before generating TypeScript');
    }

    const name = this.getName();
    if (name) {
      CodeGeneratorContext.curFile().addSymbol(name, this.shouldBeExported(), this);

      // If this type has a symbol, always use the symbol name
      // as a reference instead of the full type definition
      return name;
    }

    return this.toTypeScriptDefinition(undefined);
  }

  toJsonSchema(): JSONSchema7 {
    this.freeze('toJsonSchema');
    if (!this.currentVariant || this.currentVariant === Variant.Internal) {
      throw new Error('You need to transform this type to external before generating JsonSchema');
    }

    const name = this.getName(false);
    if (name) {
      CodeGeneratorContext.curFile().addSymbol(name, this.shouldBeExported(), this);

      // If this type has a symbol, always use the symbol name
      // as a reference instead of the full type definition
      return { $ref: `#/definitions/${name}` };
    }

    return this.toJsonSchemaDefinition();
  }

  abstract toJsonSchemaDefinition(): JSONSchema7;

  abstract toTypeScriptDefinition(symbol: string | undefined): string;
}

export abstract class MaybeOptionalCodeGenerator<T> extends MaybeSymbolizedCodeGenerator<T> {
  optional(optionality?: Optionality<T>): this {
    this.ensureMutable();
    this.internal.optional = optionality || {};
    return this;
  }

  isOptional(): boolean {
    const isOptional = this.internal.optional !== false;
    const onlyIn = this.internal.optional && this.internal.optional.onlyIn;
    const matchesCurrentVariant = !onlyIn || onlyIn === this.currentVariant;
    return isOptional && matchesCurrentVariant;
  }

  containsVariationDifferences(): boolean {
    const optionalIn = this.internal.optional !== false ? this.internal.optional.onlyIn : undefined;
    return super.containsVariationDifferences() || optionalIn !== undefined;
  }
}

export abstract class DescribableCodeGenerator<T> extends MaybeOptionalCodeGenerator<T> {
  setTitle(title: string): this {
    this.ensureMutable();
    this.internal.jsonSchema.title = title;
    return this;
  }

  setDescription(description: string): this {
    this.ensureMutable();
    this.internal.jsonSchema.description = description;
    return this;
  }

  addExample(...examples: T[]): this {
    this.ensureMutable();
    this.internal.jsonSchema.examples.push(...examples);
    return this;
  }
}

export interface CodeGeneratorWithProperties {
  hasProperty(name: string): boolean;
  getProperty(name: string): CodeGenerator<any> | undefined;
  getProperties(): CodeGenerator<any>[];
}

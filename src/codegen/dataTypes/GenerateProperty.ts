import type { JSONSchema7 } from 'json-schema';

import { CodeGenerator, MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
import type { Variant } from 'src/codegen/CG';
import type { Extract } from 'src/codegen/CodeGenerator';

/**
 * Generates a property on an object. Remember to call insertBefore/insertAfter/insertFirst before adding it to
 * the object (by calling obj.addProperty(<this object>)).
 */
export class GenerateProperty<Val extends CodeGenerator<any>> extends CodeGenerator<Extract<Val>> {
  private _insertBefore?: string;
  private _insertAfter?: string;
  private _insertFirst = false;
  private _onlyVariant?: Variant;
  private _added = false;

  constructor(
    public readonly name: string,
    public type: Val,
  ) {
    super();
  }

  protected ensureMutable(): void {
    super.ensureMutable();
    if (this._added) {
      throw new Error('Cannot modify added property');
    }
  }

  /**
   * Important: Call this on the property object before adding it to the object
   */
  insertBefore(otherPropertyName: string): this {
    this.ensureMutable();
    this._insertBefore = otherPropertyName;
    return this;
  }

  /**
   * Important: Call this on the property object before adding it to the object
   */
  insertAfter(otherPropertyName: string): this {
    this.ensureMutable();
    this._insertAfter = otherPropertyName;
    return this;
  }

  /**
   * Important: Call this on the property object before adding it to the object
   */
  insertFirst(): this {
    this.ensureMutable();
    this._insertBefore = undefined;
    this._insertAfter = undefined;
    this._insertFirst = true;
    return this;
  }

  onlyIn(variant: Variant): this {
    this.ensureMutable();
    this._onlyVariant = variant;
    return this;
  }

  shouldExistIn(variant: Variant): boolean {
    return !this._onlyVariant || this._onlyVariant === variant;
  }

  toObject() {
    return {
      name: this.name,
      insertBefore: this._insertBefore,
      insertAfter: this._insertAfter,
      insertFirst: this._insertFirst,
      onlyVariant: this._onlyVariant,
    };
  }

  containsVariationDifferences(): boolean {
    if (super.containsVariationDifferences()) {
      return true;
    }

    if (this._onlyVariant) {
      return true;
    }

    return this.type.containsVariationDifferences();
  }

  transformTo(variant: Variant): GenerateProperty<any> {
    if (this._onlyVariant && this._onlyVariant !== variant) {
      throw new Error(
        'Cannot transform to target variant when the property is not supposed to be present in this ' +
          'variants. This is probably a bug, as the property should have been filtered out before this point.',
      );
    }

    if (this.currentVariant === variant) {
      return this;
    }

    const transformedType = this.type.transformTo(variant);
    const next = new GenerateProperty(this.name, transformedType);
    next._insertFirst = this._insertFirst;
    next._insertBefore = this._insertBefore;
    next._insertAfter = this._insertAfter;
    next._onlyVariant = this._onlyVariant;
    next._added = this._added;
    next.internal = structuredClone(this.internal);
    next.internal.source = this;
    next.currentVariant = variant;

    return next;
  }

  toTypeScript() {
    if (!this.currentVariant) {
      throw new Error('You need to transform this type to either external or internal before generating TypeScript');
    }

    return this.type instanceof MaybeOptionalCodeGenerator && this.type.isOptional()
      ? `${this.name}?: ${this.type.toTypeScript()};`
      : `${this.name}: ${this.type.toTypeScript()};`;
  }

  toJsonSchema(): JSONSchema7 {
    throw new Error('Do not call this directly, generate JsonSchema for the object (or property type) instead');
  }

  setAsAdded() {
    this._added = true;
  }
}

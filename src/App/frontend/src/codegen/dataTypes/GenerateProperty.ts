import type { JSONSchema7 } from 'json-schema';

import { CodeGenerator, MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
import type { Extract } from 'src/codegen/CodeGenerator';

/**
 * Generates a property on an object. Remember to call insertBefore/insertAfter/insertFirst before adding it to
 * the object (by calling obj.addProperty(<this object>)).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class GenerateProperty<Val extends CodeGenerator<any>> extends CodeGenerator<Extract<Val>> {
  private _insertBefore?: string;
  private _insertAfter?: string;
  private _insertFirst = false;
  private _added = false;
  private _inSchema = true;

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

  omitInSchema(): this {
    this._inSchema = false;
    return this;
  }

  shouldOmitInSchema(): boolean {
    return !this._inSchema;
  }

  toObject() {
    return {
      name: this.name,
      insertBefore: this._insertBefore,
      insertAfter: this._insertAfter,
      insertFirst: this._insertFirst,
    };
  }

  toTypeScript() {
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

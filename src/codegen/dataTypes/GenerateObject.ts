import type { JSONSchema7 } from 'json-schema';

import { CG } from 'src/codegen/CG';
import { DescribableCodeGenerator, MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
import { getSourceForCommon } from 'src/codegen/Common';
import { GenerateCommonImport } from 'src/codegen/dataTypes/GenerateCommonImport';
import type { CodeGenerator, CodeGeneratorWithProperties, Extract } from 'src/codegen/CodeGenerator';
import type { GenerateProperty } from 'src/codegen/dataTypes/GenerateProperty';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Props = GenerateProperty<any>[];
export type AsInterface<P extends Props> = {
  [K in P[number]['name']]: Extract<P[number]['type']>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Extendables = GenerateCommonImport<any> | GenerateObject<any>;

/**
 * Generates an object definition type. This is used for both interfaces and types in TypeScript, and can extend other
 * object types (either ones you generate, or from the common imports).
 */
export class GenerateObject<P extends Props>
  extends DescribableCodeGenerator<AsInterface<P>>
  implements CodeGeneratorWithProperties
{
  private readonly properties: P;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _additionalProperties: CodeGenerator<any> | false = false;
  private _extends: Extendables[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _extendedBy: GenerateObject<any>[] = [];

  constructor(...properties: P) {
    super();
    this.properties = properties;
  }

  extends(...symbols: Extendables[]): this {
    this.ensureMutable();
    for (const symbol of symbols) {
      if (symbol instanceof GenerateObject) {
        if (symbol.isForwarding()) {
          this.extends(symbol._extends[0]);
        } else {
          this.extendObject(symbol);
        }
      } else {
        const source = getSourceForCommon(symbol.key);
        if (source instanceof GenerateObject) {
          source.ensureMutable();
          source._extendedBy.push(this);

          // It's important we push the symbol, not the source, so we import from common.generated.ts
          // instead of duplicating its code
          this._extends.push(symbol);
        } else {
          throw new Error(`Cannot extend ${symbol.key}, it is not an object`);
        }
      }
    }

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extendObject(obj: GenerateObject<any>) {
    obj.ensureMutable();
    obj._extendedBy.push(this);
    this._extends.push(obj);
  }

  private isForwarding(): boolean {
    return this._extends.length === 1 && this.properties.length === 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalProperties(type: CodeGenerator<any> | false) {
    this.ensureMutable();
    this._additionalProperties = type;
    return this;
  }

  hasProperty(name: string): boolean {
    return this.properties.some((property) => property.name === name);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addProperty(prop: GenerateProperty<any>): this {
    this.ensureMutable();
    const { name, insertBefore, insertAfter, insertFirst } = prop.toObject();
    prop.setAsAdded();

    // Replace property if it already exists
    const index = this.properties.findIndex((property) => property.name === name);
    if (index !== -1) {
      this.properties[index] = prop;
      return this;
    }

    if (insertBefore) {
      const index = this.properties.findIndex((property) => property.name === insertBefore);
      if (index === -1) {
        throw new Error(`Property ${insertBefore} not found`);
      }
      this.properties.splice(index, 0, prop);
      return this;
    }

    if (insertAfter) {
      const index = this.properties.findIndex((property) => property.name === insertAfter);
      if (index === -1) {
        throw new Error(`Property ${insertAfter} not found`);
      }
      this.properties.splice(index + 1, 0, prop);
      return this;
    }

    if (insertFirst) {
      this.properties.unshift(prop);
      return this;
    }

    this.properties.push(prop);
    return this;
  }

  removeProperty(name: string): this {
    this.ensureMutable();
    const index = this.properties.findIndex((property) => property.name === name);
    if (index === -1) {
      throw new Error(`Property ${name} not found`);
    }
    this.properties.splice(index, 1);
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProperty(name: string): GenerateProperty<any> | undefined {
    if (!this.hasProperty(name)) {
      return undefined;
    }
    return this.properties.find((property) => property.name === name);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProperties(): GenerateProperty<any>[] {
    return this.properties;
  }

  private ensureExtendsHaveNames() {
    for (const e of this._extends) {
      if (e instanceof GenerateCommonImport) {
        continue;
      }
      if (!e.getName()) {
        throw new Error('Cannot extend an object that does not have a name');
      }
    }
  }

  /**
   * When extending other objects, we need to make sure that the properties of the extended objects that collide with
   * our own properties properly extend their parents. Otherwise, we'd get TypeScript errors about incompatible types.
   */
  private getPropertiesAsExtensions() {
    if (!this._extends.length) {
      return this.properties;
    }

    return this.getProperties().map((prop) => {
      const parentsWithProp = this._extends.filter((e) => e.hasProperty(prop.name)).map((e) => e.getName());
      if (!parentsWithProp.length) {
        return prop;
      }

      for (const parent of parentsWithProp) {
        if (!parent) {
          throw new Error(`Cannot extend an object that does not have a name`);
        }
      }

      const adapted = new CG.intersection(
        prop.type,
        ...parentsWithProp.map(
          (e) =>
            new CG.raw({
              typeScript: `${e}['${prop.name}']`,
            }),
        ),
      );

      if (prop.type instanceof MaybeOptionalCodeGenerator && prop.type.isOptional()) {
        adapted.optional();
      }

      return new CG.prop(prop.name, adapted);
    });
  }

  toTypeScriptDefinition(symbol: string | undefined): string {
    this.ensureExtendsHaveNames();
    const properties: string[] = this.getPropertiesAsExtensions().map((prop) => prop.toTypeScript());

    if (this._additionalProperties) {
      if (this._additionalProperties instanceof MaybeOptionalCodeGenerator && this._additionalProperties.isOptional()) {
        properties.push(`[key: string]: ${this._additionalProperties.toTypeScript()} | undefined;`);
      } else {
        properties.push(`[key: string]: ${this._additionalProperties.toTypeScript()};`);
      }
    }

    const extendsClause = this._extends.length
      ? ` extends ${this._extends.map((e) => e.toTypeScript()).join(', ')}`
      : '';
    const extendsIntersection = this._extends.length
      ? ` & ${this._extends.map((e) => e.toTypeScript()).join(' & ')}`
      : '';

    if (!properties.length && this._extends.length) {
      return symbol
        ? `type ${symbol} = ${extendsIntersection.replace(/^ & /, '')};`
        : `${extendsIntersection.replace(/^ & /, '')}`;
    }

    if (!properties.length) {
      throw new Error('About to generate empty object, this is probably a bug');
    }

    return symbol
      ? `interface ${symbol}${extendsClause} { ${properties.join('\n')} }`
      : `{ ${properties.join('\n')} }${extendsIntersection}`;
  }

  private getPropertyList(target: 'typeScript' | 'jsonSchema'): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all: { [key: string]: GenerateProperty<any> };
    required: string[];
  } {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all: { [key: string]: GenerateProperty<any> } = {};
    const required: string[] = [];

    for (const e of this._extends) {
      const obj = e instanceof GenerateCommonImport ? getSourceForCommon(e.key) : e;
      if (!(obj instanceof GenerateObject)) {
        throw new Error(`Cannot extend a non-object type`);
      }

      const { all: allFromExtend, required: requiredFromExtend } = obj.getPropertyList(target);
      for (const key of Object.keys(allFromExtend)) {
        const ourProp = this.getProperty(key);
        const theirProp = allFromExtend[key];
        if (ourProp && ourProp.type instanceof GenerateObject) {
          ourProp.type.extends(theirProp.type);
        } else if (ourProp) {
          throw new Error(`Cannot extend an object containing the same property (${key}) that is not an object`);
        }

        all[key] = theirProp;
      }
      required.push(...requiredFromExtend);
    }

    for (const prop of this.properties) {
      if (target === 'jsonSchema' && prop.shouldOmitInSchema()) {
        continue;
      }

      all[prop.name] = prop;
      if (!(prop.type instanceof MaybeOptionalCodeGenerator) || !prop.type.isOptional()) {
        required.push(prop.name);
      }
    }

    return { all, required };
  }

  toJsonSchemaDefinition(): JSONSchema7 {
    this.ensureExtendsHaveNames();
    if (this._extends.length) {
      if (this.isForwarding()) {
        return { $ref: `#/definitions/${this._extends[0].getName(false)}` };
      }

      const { all: allProperties, required: requiredProperties } = this.getPropertyList('jsonSchema');
      const allPropsAsTrue: { [key: string]: true } = {};
      for (const key of Object.keys(allProperties)) {
        allPropsAsTrue[key] = true;
      }

      const allOf = this._extends.map((e) => e.toJsonSchema());
      if (this.properties.length) {
        allOf.push(this.innerToJsonSchema(false));
      }

      const propertyListObj: JSONSchema7 | undefined =
        this._extendedBy.length === 0
          ? {
              // This trick makes it possible to extend multiple other object, but still
              // preserve the behaviour of additionalProperties = false. If it was set on each of the objects we
              // extended, the objects would mutually exclude each other's properties. For that reason, we'll only
              // set it on the last object in the chain.
              type: 'object',
              properties: allPropsAsTrue,
              required: requiredProperties.length ? requiredProperties : undefined,
              additionalProperties: this.additionalPropertiesToJsonSchema(),
            }
          : undefined;

      return {
        allOf: [...allOf, ...(propertyListObj ? [propertyListObj] : [])],
      };
    }

    return this.innerToJsonSchema();
  }

  private innerToJsonSchema(respectAdditionalProperties = true): JSONSchema7 {
    const properties: { [key: string]: JSONSchema7 } = {};
    const requiredProps: string[] = [];
    for (const prop of this.properties) {
      if (prop.shouldOmitInSchema()) {
        continue;
      }
      properties[prop.name] = prop.type.toJsonSchema();

      if (!(prop.type instanceof MaybeOptionalCodeGenerator) || !prop.type.isOptional()) {
        requiredProps.push(prop.name);
      }
    }

    return {
      ...this.getInternalJsonSchema(),
      type: 'object',
      properties,
      required: requiredProps.length ? requiredProps : undefined,
      additionalProperties: respectAdditionalProperties ? this.additionalPropertiesToJsonSchema() : undefined,
    };
  }

  private additionalPropertiesToJsonSchema(): JSONSchema7['additionalProperties'] {
    if (this._extendedBy.length && this._additionalProperties === false) {
      return undefined;
    } else if (this._extendedBy.length) {
      throw new Error(`Cannot extend an object that has additionalProperties set`);
    }

    if (this._additionalProperties === false) {
      return false;
    }

    return this._additionalProperties?.toJsonSchema();
  }
}

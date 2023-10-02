import { CG } from 'src/codegen/CG';
import { GenerateRaw } from 'src/codegen/dataTypes/GenerateRaw';
import { GenerateUnion } from 'src/codegen/dataTypes/GenerateUnion';
import type { GenerateCommonImport } from 'src/codegen/dataTypes/GenerateCommonImport';
import type { GenerateObject } from 'src/codegen/dataTypes/GenerateObject';
import type { GenerateProperty } from 'src/codegen/dataTypes/GenerateProperty';
import type { GenerateTextResourceBinding } from 'src/codegen/dataTypes/GenerateTextResourceBinding';

/**
 * A class that can be used to generate a component-like object. This is most likely used for advanced components
 * where it is possible the base component configuration is a union of multiple possible configurations varying wildly.
 * One example of this is Group (which can be a non-repeating group, a repeating group, etc)
 *
 * The way you should use this is to override the exported symbol of your component, and add new symbols of this type.
 * I.e., you could override the exported symbol to a GenerateUnion-type, and adding multiples of this type to the union.
 */
export class GenerateComponentLike {
  readonly inner = new CG.obj();

  public addProperty(prop: GenerateProperty<any>): this {
    this.inner.addProperty(prop);
    return this;
  }

  private ensureTextResourceBindings(): void {
    const existing = this.inner.getProperty('textResourceBindings');
    if (!existing || existing.type instanceof GenerateRaw) {
      this.inner.addProperty(new CG.prop('textResourceBindings', new CG.obj().optional()));
    }
  }

  public addTextResource(arg: GenerateTextResourceBinding): this {
    this.ensureTextResourceBindings();
    this.inner.getProperty('textResourceBindings')?.type.addProperty(arg);

    return this;
  }

  public extendTextResources(type: GenerateCommonImport<any>): this {
    this.ensureTextResourceBindings();
    this.inner.getProperty('textResourceBindings')?.type.extends(type);

    return this;
  }

  public addTextResourcesForLabel(): this {
    return this.extendTextResources(CG.common('TRBLabel'));
  }

  public makeSelectionComponent(full = true): this {
    this.inner.extends(full ? CG.common('ISelectionComponentFull') : CG.common('ISelectionComponent'));

    return this;
  }

  /**
   * Adding multiple data model bindings to the component makes it a union
   */
  public addDataModelBinding(
    type: GenerateCommonImport<'IDataModelBindingsSimple' | 'IDataModelBindingsList'> | GenerateObject<any>,
  ): this {
    const name = 'dataModelBindings';
    const existing = this.inner.getProperty(name)?.type;
    if (existing && existing instanceof GenerateUnion) {
      existing.addType(type);
    } else if (existing && !(existing instanceof GenerateRaw)) {
      const union = new CG.union(existing, type);
      this.inner.addProperty(new CG.prop(name, union));
    } else {
      this.inner.addProperty(new CG.prop(name, type));
    }

    return this;
  }

  extends(type: GenerateCommonImport<any> | GenerateComponentLike): this {
    if (type instanceof GenerateComponentLike) {
      this.inner.extends(type.inner);
      return this;
    }

    this.inner.extends(type);
    return this;
  }
}

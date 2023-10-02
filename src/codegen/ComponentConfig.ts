import type { JSONSchema7 } from 'json-schema';

import { CG, Variant } from 'src/codegen/CG';
import { GenerateComponentLike } from 'src/codegen/dataTypes/GenerateComponentLike';
import { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import { CompCategory } from 'src/layout/common';
import type { MaybeSymbolizedCodeGenerator } from 'src/codegen/CodeGenerator';
import type { GenerateCommonImport } from 'src/codegen/dataTypes/GenerateCommonImport';
import type { GenerateObject } from 'src/codegen/dataTypes/GenerateObject';
import type { GenerateProperty } from 'src/codegen/dataTypes/GenerateProperty';
import type { GenerateTextResourceBinding } from 'src/codegen/dataTypes/GenerateTextResourceBinding';
import type {
  ActionComponent,
  ContainerComponent,
  FormComponent,
  PresentationComponent,
} from 'src/layout/LayoutComponent';

export interface RequiredComponentConfig {
  category: CompCategory;
  rendersWithLabel: boolean;
  capabilities: {
    renderInTable: boolean;
    renderInButtonGroup: boolean;
    renderInAccordion: boolean;
    renderInAccordionGroup: boolean;
  };
}

const CategoryImports: { [Category in CompCategory]: GenerateImportedSymbol<any> } = {
  [CompCategory.Action]: new GenerateImportedSymbol<ActionComponent<any>>({
    import: 'ActionComponent',
    from: 'src/layout/LayoutComponent',
  }),
  [CompCategory.Form]: new GenerateImportedSymbol<FormComponent<any>>({
    import: 'FormComponent',
    from: 'src/layout/LayoutComponent',
  }),
  [CompCategory.Container]: new GenerateImportedSymbol<ContainerComponent<any>>({
    import: 'ContainerComponent',
    from: 'src/layout/LayoutComponent',
  }),
  [CompCategory.Presentation]: new GenerateImportedSymbol<PresentationComponent<any>>({
    import: 'PresentationComponent',
    from: 'src/layout/LayoutComponent',
  }),
};

export class ComponentConfig extends GenerateComponentLike {
  public type: string;
  public typeSymbol: string;
  public layoutNodeType = CG.baseLayoutNode;

  private exportedComp: MaybeSymbolizedCodeGenerator<any> = this.inner;

  constructor(public readonly config: RequiredComponentConfig) {
    super();
    this.inner.extends(CG.common('ComponentBase'));
    this.inner.addProperty(
      new CG.prop('textResourceBindings', new CG.raw({ typeScript: 'undefined' }).optional()).onlyIn(Variant.Internal),
    );
    this.inner.addProperty(
      new CG.prop('dataModelBindings', new CG.raw({ typeScript: 'undefined' }).optional()).onlyIn(Variant.Internal),
    );

    if (config.category === CompCategory.Form) {
      this.inner.extends(CG.common('FormComponentProps'));
      this.extendTextResources(CG.common('TRBFormComp'));
    }
    if (config.category === CompCategory.Form || config.category === CompCategory.Container) {
      this.inner.extends(CG.common('SummarizableComponentProps'));
      this.extendTextResources(CG.common('TRBSummarizable'));
    }

    if (config.rendersWithLabel) {
      this.inner.extends(CG.common('LabeledComponentProps'));
      this.extendTextResources(CG.common('TRBLabel'));
    }
  }

  private ensureNotOverridden(): void {
    if (this.inner !== this.exportedComp) {
      throw new Error('The exported symbol has been overridden, you cannot call this method anymore');
    }
  }

  addProperty(prop: GenerateProperty<any>): this {
    this.ensureNotOverridden();
    return super.addProperty(prop);
  }

  makeSelectionComponent(full = true): this {
    this.ensureNotOverridden();
    return super.makeSelectionComponent(full);
  }

  addTextResourcesForLabel(): this {
    this.ensureNotOverridden();
    return super.addTextResourcesForLabel();
  }

  addDataModelBinding(
    type: GenerateCommonImport<'IDataModelBindingsSimple' | 'IDataModelBindingsList'> | GenerateObject<any>,
  ): this {
    this.ensureNotOverridden();
    return super.addDataModelBinding(type);
  }

  extendTextResources(type: GenerateCommonImport<any>): this {
    this.ensureNotOverridden();
    return super.extendTextResources(type);
  }

  /**
   * TODO: Add support for some required text resource bindings (but only make them required in external types)
   */
  addTextResource(arg: GenerateTextResourceBinding): this {
    this.ensureNotOverridden();
    return super.addTextResource(arg);
  }

  public setType(type: string, symbol?: string): this {
    const symbolName = symbol ?? type;
    this.type = type;
    this.typeSymbol = symbolName;
    this.inner.addProperty(new CG.prop('type', new CG.const(this.type)).insertFirst());
    if (this.inner !== this.exportedComp) {
      this.inner.exportAs(`${symbolName}Base`);
    }

    return this;
  }

  /**
   * Overrides the exported symbol for this component with something else. This lets you change the base component
   * type to, for example, a union of multiple types. This is for example useful for components that have
   * configurations that change a lot of options based on some other options. Examples include the Group component,
   * where many options rely on the Group being configured as repeating or not.
   */
  public overrideExported(comp: MaybeSymbolizedCodeGenerator<any>): this {
    this.exportedComp = comp;
    return this;
  }

  public setLayoutNodeType(type: GenerateImportedSymbol<any>): this {
    this.layoutNodeType = type;
    return this;
  }

  public generateConfigFile(): string {
    // Forces the objects to register in the context and be exported via the context symbols table
    this.exportedComp.exportAs(`Comp${this.typeSymbol}`);
    const ext = this.exportedComp.transformTo(Variant.External);
    ext.toTypeScript();
    const int = this.exportedComp.transformTo(Variant.Internal);
    int.toTypeScript();

    const impl = new CG.import({
      import: this.typeSymbol,
      from: `./index`,
    }).transformTo(Variant.Internal);

    const nodeObj = this.layoutNodeType.transformTo(Variant.Internal).toTypeScript();
    const nodeSuffix = this.layoutNodeType === CG.baseLayoutNode ? `<${int.getName()}, '${this.type}'>` : '';

    const staticElements = [
      `export const Config = {
         def: new ${impl.toTypeScript()}(),
         rendersWithLabel: ${this.config.rendersWithLabel ? 'true' : 'false'} as const,
         nodeConstructor: ${nodeObj},
       }`,
      `export type TypeConfig = {
         layout: ${ext.getName()};
         nodeItem: ${int.getName()};
         nodeObj: ${nodeObj}${nodeSuffix};
       }`,
    ];

    return staticElements.join('\n\n');
  }

  public generateDefClass(): string {
    const symbol = this.typeSymbol;
    const category = this.config.category;
    const categorySymbol = CategoryImports[category].transformTo(Variant.Internal).toTypeScript();

    const methods: string[] = [];
    for (const [key, value] of Object.entries(this.config.capabilities)) {
      if (key.startsWith('renderIn')) {
        const name = key.replace('renderIn', '');
        const valueStr = JSON.stringify(value);
        methods.push(`canRenderIn${name}(): ${valueStr} {\nreturn ${valueStr}; }`);
        continue;
      }

      throw new Error(`Unknown capability ${key}`);
    }

    return `export abstract class ${symbol}Def extends ${categorySymbol}<'${this.type}'> {
      ${methods.join('\n\n')}
    }`;
  }

  public toJsonSchema(): JSONSchema7 {
    return this.exportedComp.transformTo(Variant.External).toJsonSchema();
  }
}

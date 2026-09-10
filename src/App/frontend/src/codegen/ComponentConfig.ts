import { CompCategory } from '@app/layout-contract';
import type { ComponentDefinition } from '@app/layout-contract';
import type { JSONSchema7 } from 'json-schema';

import { CG } from 'src/codegen/CG';
import { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import { GenerateObject } from 'src/codegen/dataTypes/GenerateObject';
import { GenerateRaw } from 'src/codegen/dataTypes/GenerateRaw';
import { GenerateUnion } from 'src/codegen/dataTypes/GenerateUnion';
import { ExprVal } from 'src/features/expressions/types';
import type { DescribableCodeGenerator, MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
import type { CompBehaviors, RequiredComponentConfig } from 'src/codegen/Config';
import type { GenerateCommonImport } from 'src/codegen/dataTypes/GenerateCommonImport';
import type { GenerateProperty } from 'src/codegen/dataTypes/GenerateProperty';
import type { GenerateTextResourceBinding } from 'src/codegen/dataTypes/GenerateTextResourceBinding';
import type { CompTypes } from 'src/layout/layout';
import type {
  ActionComponent,
  ContainerComponent,
  FormComponent,
  PresentationComponent,
} from 'src/layout/LayoutComponent';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CategoryImports: { [Category in CompCategory]: GenerateImportedSymbol<any> } = {
  [CompCategory.Action]: new GenerateImportedSymbol<ActionComponent<CompTypes>>({
    import: 'ActionComponent',
    from: 'src/layout/LayoutComponent',
  }),
  [CompCategory.Form]: new GenerateImportedSymbol<FormComponent<CompTypes>>({
    import: 'FormComponent',
    from: 'src/layout/LayoutComponent',
  }),
  [CompCategory.Container]: new GenerateImportedSymbol<ContainerComponent<CompTypes>>({
    import: 'ContainerComponent',
    from: 'src/layout/LayoutComponent',
  }),
  [CompCategory.Presentation]: new GenerateImportedSymbol<PresentationComponent<CompTypes>>({
    import: 'PresentationComponent',
    from: 'src/layout/LayoutComponent',
  }),
};

export class ComponentConfig {
  public type: string | undefined;
  public typeSymbol: string;
  readonly inner = new CG.obj();
  public behaviors: CompBehaviors = {
    isSummarizable: false,
    canHaveLabel: false,
    canHaveOptions: false,
    canHaveAttachments: false,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected createSummaryOverrides: (() => MaybeOptionalCodeGenerator<any>) | undefined;
  protected hasSummaryOverridesExtender = false;

  constructor(public readonly config: RequiredComponentConfig) {
    this.inner.extends(CG.common('ComponentBase'));

    if (config.category === CompCategory.Form) {
      this.inner.extends(CG.common('FormComponentProps'));
      this.extendTextResources(CG.common('TRBFormComp'));
    }
    if (this.isFormLike()) {
      this.inner.extends(CG.common('SummarizableComponentProps'));
      this.extendTextResources(CG.common('TRBSummarizable'));
      this.behaviors.isSummarizable = true;
    }
  }

  public setType(type: string, symbol?: string): this {
    const symbolName = symbol ?? type;
    this.type = type;
    this.typeSymbol = symbolName;
    this.inner.addProperty(
      new CG.prop(
        'type',
        new CG.const(this.type)
          .setTitle('Component type', 'Komponenttype')
          .setDescription(
            'Identifies which component type this configuration represents.',
            'Angir hvilken komponenttype konfigurasjonen gjelder.',
          ),
      ).insertFirst(),
    );

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public addProperty(prop: GenerateProperty<any>): this {
    this.inner.addProperty(prop);
    return this;
  }

  private ensureTextResourceBindings(): void {
    const existing = this.inner.getProperty('textResourceBindings');
    if (!existing || existing.type instanceof GenerateRaw) {
      this.inner.addProperty(
        new CG.prop(
          'textResourceBindings',
          new CG.obj()
            .optional()
            .setTitle('Text resources', 'Tekstressurser')
            .setDescription(
              'Connects component texts to text resources or expressions.',
              'Kobler tekstene i komponenten til tekstressurser eller uttrykk.',
            ),
        ),
      );
    }
  }

  /**
   * TODO: Add support for some required text resource bindings (but only make them required in external types)
   */
  public addTextResource(arg: GenerateTextResourceBinding): this {
    this.ensureTextResourceBindings();
    this.inner.getProperty('textResourceBindings')?.type.addProperty(arg);

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public extendTextResources(type: GenerateCommonImport<any>): this {
    this.ensureTextResourceBindings();
    this.inner.getProperty('textResourceBindings')?.type.extends(type);

    return this;
  }

  public isFormLike(): boolean {
    return this.config.category === CompCategory.Form || this.config.category === CompCategory.Container;
  }

  private hasDataModelBindings(): boolean {
    const prop = this.inner.getProperty('dataModelBindings');
    return this.isFormLike() && prop !== undefined && !(prop.type instanceof GenerateRaw);
  }

  /**
   * Adding multiple data model bindings to the component makes it a union
   */
  public addDataModelBinding(
    type:
      | GenerateCommonImport<
          | 'IDataModelBindingsSimple'
          | 'IDataModelBindingsList'
          | 'IDataModelBindingsOptionsSimple'
          | 'IDataModelBindingsLikert'
        >
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | GenerateObject<any>,
  ): this {
    if (!this.isFormLike()) {
      throw new Error(
        `Component wants dataModelBindings, but is not a form nor a container component. ` +
          `Only these categories can have data model bindings.`,
      );
    }

    const name = 'dataModelBindings';
    const existing = this.inner.getProperty(name)?.type;

    if (!existing || existing instanceof GenerateRaw) {
      // For all components with dataModelBindings, the backend wants this property defined so that app-developers can
      // escape from hidden-data-deletion per-component.
      this.inner.addProperty(
        new CG.prop(
          'removeWhenHidden',
          new CG.expr(ExprVal.Boolean)
            .setTitle(
              'Remove fields from component dataModelBindings when hidden expression is true',
              'Behold datamodellfelter når komponenten skjules',
            )
            .setDescription(
              'Override the logic cleaning data for hidden components at task end, if you want to keep data ' +
                'referenced in hidden components. Currently only has effect if AppSettings.RemoveHiddenData is enabled.',
              'Overstyrer oppryddingen av data for skjulte komponenter ved slutten av oppgaven.',
            )
            .optional(),
        ),
      );
    }

    if (existing && existing instanceof GenerateUnion) {
      existing.addType(type);
    } else if (existing && !(existing instanceof GenerateRaw)) {
      const union = new CG.union(existing, type);
      this.inner.addProperty(new CG.prop(name, describeDataModelBindings(union)));
    } else {
      this.inner.addProperty(new CG.prop(name, describeDataModelBindings(type)));
    }

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extends(type: GenerateCommonImport<any> | ComponentConfig): this {
    if (type instanceof ComponentConfig) {
      this.inner.extends(type.inner);
      return this;
    }

    this.inner.extends(type);
    return this;
  }

  makeSummarizable(): this {
    if (this.isFormLike()) {
      throw new Error(`Component is a form or container component, it is always summarizable`);
    }

    this.extendTextResources(CG.common('TRBSummarizable'));
    this.extends(CG.common('SummarizableComponentProps'));
    this.behaviors.isSummarizable = true;
    return this;
  }

  /**
   * @see generateSummaryOverrides
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public addSummaryOverrides(extender?: (arg: GenerateObject<any>) => void): this {
    if (this.createSummaryOverrides) {
      throw new Error(`Component already has Summary2 overrides! Do not call this twice.`);
    }

    this.hasSummaryOverridesExtender = !!extender;
    this.createSummaryOverrides = () => {
      if (!this.type) {
        throw new Error('Type not specified yet');
      }
      if (!this.behaviors.isSummarizable) {
        throw new Error(
          `Component '${this.type}' is not summarizable, so it cannot have Summary2 overrides. ` +
            `If you want to add Summary2 overrides, make sure the component is summarizable ` +
            `(call makeSummarizable() on the component config).`,
        );
      }

      const overrides = extender
        ? new CG.obj().extends(CG.common('ISummaryOverridesCommon')).exportAs(`${this.type}SummaryOverrides`)
        : CG.common('ISummaryOverridesCommon');

      if (extender && overrides instanceof GenerateObject) {
        extender(overrides);
      }

      return this.makeSummaryOverridesUnion(overrides).exportAs(`${this.type}SummaryOverridesWithRef`);
    };

    return this;
  }

  protected makeSummaryOverridesUnion(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    overrides: GenerateObject<any> | GenerateCommonImport<'ISummaryOverridesCommon'>,
  ) {
    if (!this.type) {
      throw new Error('Type not specified yet');
    }

    const oneComponent = new CG.obj(new CG.prop('componentId', new CG.str()))
      .extends(overrides)
      .setTitle(`Summary overrides for ${this.type}`, `Overstyringer av oppsummering for ${this.type}`)
      .setDescription(
        `Properties for how to display the summary of this ${this.type} component`,
        `Egenskaper som styrer hvordan oppsummeringen av denne ${this.type}-komponenten vises.`,
      );

    const allComponents = new CG.obj(new CG.prop('componentType', new CG.const(this.type)))
      .extends(overrides)
      .setTitle(
        `Summary overrides for all ${this.type}`,
        `Overstyringer av oppsummering for alle ${this.type}-komponenter`,
      )
      .setDescription(
        `Properties for how to display the summary of all ${this.type} components`,
        `Egenskaper som styrer hvordan oppsummeringen av alle ${this.type}-komponenter vises.`,
      );

    return new CG.union(oneComponent, allComponents);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getSummaryOverridesImport(variant: 'plain' | 'withRef'): MaybeOptionalCodeGenerator<any> | undefined {
    if (!this.createSummaryOverrides) {
      return undefined;
    }

    if (variant === 'plain' && !this.hasSummaryOverridesExtender) {
      return CG.common('ISummaryOverridesCommon');
    }
    if (variant === 'plain') {
      return new CG.raw({
        typeScript: `${this.type}SummaryOverrides`,
      });
    }

    if (!this.hasSummaryOverridesExtender) {
      return this.makeSummaryOverridesUnion(CG.common('ISummaryOverridesCommon'));
    }

    return new CG.import({
      import: `${this.type}SummaryOverridesWithRef`,
      from: `@app/layout-contract/generated/components/${this.type}/config.generated`,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getSummaryOverrides(): MaybeOptionalCodeGenerator<any> | undefined {
    return this.createSummaryOverrides?.();
  }

  private beforeFinalizing(): void {
    // We have to add these to our typescript types in order for ITextResourceBindings<T>, and similar to work.
    // Components that doesn't have them, will always have the 'undefined' value.
    if (!this.inner.hasProperty('dataModelBindings')) {
      this.inner.addProperty(
        new CG.prop('dataModelBindings', new CG.raw({ typeScript: 'undefined' }).optional()).omitInSchema(),
      );
    }
    if (!this.inner.hasProperty('textResourceBindings')) {
      this.inner.addProperty(
        new CG.prop('textResourceBindings', new CG.raw({ typeScript: 'undefined' }).optional()).omitInSchema(),
      );
    }
  }

  public generateConfigTypes(): string {
    this.beforeFinalizing();
    // Forces the objects to register in the context and be exported via the context symbols table
    this.inner.exportAs(`Comp${this.typeSymbol}External`);
    this.inner.toTypeScript();

    const CompCategory = new CG.import({
      import: 'CompCategory',
      from: '@app/layout-contract',
    });

    const staticElements = [
      `export const componentConfig = {
         category: ${CompCategory}.${this.config.category},
         availability: '${this.config.availability}',
         capabilities: ${JSON.stringify(this.config.capabilities, null, 2)},
         behaviors: ${JSON.stringify(this.behaviors, null, 2)},
       } as const;`,
      `export type TypeConfig = {
         category: typeof componentConfig.category;
         availability: typeof componentConfig.availability;
         layout: ${this.inner};
         summaryOverrides: ${this.getSummaryOverridesImport('plain')?.toTypeScript() ?? 'undefined'};
         summaryOverridesWithRef: ${this.getSummaryOverrides()?.toTypeScript() ?? 'undefined'};
       }`,
    ];

    return staticElements.join('\n\n');
  }

  public generateSerializedType(): string {
    this.beforeFinalizing();
    return `export type Comp${this.typeSymbol}Serialized = ${this.inner.toTypeScriptDefinition(undefined)};`;
  }

  public generateRuntimeConfigFile(): string {
    const impl = new CG.import({
      import: this.typeSymbol,
      from: `src/layout/${this.type}/index`,
    });
    const componentConfig = new CG.import({
      import: 'componentConfig',
      from: `@app/layout-contract/generated/components/${this.type}/config.generated`,
    });
    return `export function getConfig() {
      return {
        def: new ${impl.toTypeScript()}(),
        ...${componentConfig.toTypeScript()},
      };
    }`;
  }

  public generateComponentCatalogEntry(): ComponentDefinition {
    this.beforeFinalizing();
    return {
      kind: this.config.category === CompCategory.Container ? 'container' : 'component',
      category: this.config.category,
      capabilities: this.config.capabilities,
      behaviors: this.behaviors,
      metadata: this.config.metadata,
      properties: this.inner.componentCatalogProperties(),
    };
  }

  public generateDefClass(): string {
    const symbol = this.typeSymbol;
    const category = this.config.category;
    const categorySymbol = CategoryImports[category].toTypeScript();

    const ExprResolver = new CG.import({
      import: 'ExprResolver',
      from: 'src/layout/LayoutComponent',
    });

    const DisplayData = new CG.import({
      import: 'DisplayData',
      from: 'src/features/displayData/index',
    });

    const IDataModelBindings = new CG.import({
      import: 'IDataModelBindings',
      from: 'src/layout/layout',
    });
    const DataModelBindingValidationContext = new CG.import({
      import: 'DataModelBindingValidationContext',
      from: 'src/layout',
    });

    const isFormComponent = this.config.category === CompCategory.Form;
    const isSummarizable = this.behaviors.isSummarizable;

    const evalCommonProps = [
      { base: CG.common('ComponentBase'), condition: true, evaluator: 'evalBase' },
      { base: CG.common('FormComponentProps'), condition: isFormComponent, evaluator: 'evalFormProps' },
      { base: CG.common('SummarizableComponentProps'), condition: isSummarizable, evaluator: 'evalSummarizable' },
    ];

    const implementsInterfaces: string[] = [];
    const evalLines: string[] = [];
    const itemLine: string[] = [];
    for (const { base, condition, evaluator } of evalCommonProps) {
      if (condition) {
        itemLine.push(`keyof ${base}`);
        evalLines.push(`...props.${evaluator}(),`);
      }
    }

    const additionalMethods: string[] = [];

    if (!this.config.functionality.customExpressions) {
      additionalMethods.push(
        `// Do not override this one, set functionality.customExpressions to true instead
        evalExpressions(props: ${ExprResolver}<'${this.type}'>) {
          return this.evalDefaultExpressions(props);
        }`,
      );
    }

    if (this.hasDataModelBindings()) {
      additionalMethods.push(
        `// You must implement this because the component has data model bindings defined
        abstract validateDataModelBindings(baseComponentId: string, bindings: ${IDataModelBindings}<'${this.type}'>, context: ${DataModelBindingValidationContext}): string[];`,
      );
    }

    if (
      this.hasDataModelBindings() &&
      this.config.category === CompCategory.Form &&
      this.config.functionality.displayData !== false
    ) {
      additionalMethods.push(
        `// This component has data model bindings, so it should be able to produce a display string
        abstract useDisplayData(baseComponentId: string): string;`,
      );
      implementsInterfaces.push(`${DisplayData}`);
    }

    const implementing = implementsInterfaces.length ? ` implements ${implementsInterfaces.join(', ')}` : '';
    return `export abstract class ${symbol}Def extends ${categorySymbol}<'${this.type}'>${implementing} {
      protected readonly type = '${this.type}';

      ${this.config.directRendering ? 'directRender(): boolean { return true; }' : ''}

      // Do not override this one, set functionality.customExpressions to true instead
      evalDefaultExpressions(props: ${ExprResolver}<'${this.type}'>) {
        return {
          ...props.item as Omit<typeof props.item, ${itemLine.join(' | ')} | 'hidden'>,
          ${evalLines.join('\n')}
          ...props.evalTrb(),
        };
      }

      ${additionalMethods.join('\n\n')}
    }`;
  }

  public toJsonSchema(): JSONSchema7 {
    this.beforeFinalizing();
    return this.inner.toJsonSchema();
  }
}

function describeDataModelBindings<T extends DescribableCodeGenerator<unknown>>(type: T): T {
  return type
    .setTitle('Data model bindings', 'Datamodellbindinger')
    .setDescription(
      'Connects component values to fields in the data model.',
      'Kobler verdiene i komponenten til felter i datamodellen.',
    );
}

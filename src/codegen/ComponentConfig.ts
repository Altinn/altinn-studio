import type { JSONSchema7 } from 'json-schema';

import { CG } from 'src/codegen/CG';
import { GenerateImportedSymbol } from 'src/codegen/dataTypes/GenerateImportedSymbol';
import { GenerateObject } from 'src/codegen/dataTypes/GenerateObject';
import { GenerateRaw } from 'src/codegen/dataTypes/GenerateRaw';
import { GenerateUnion } from 'src/codegen/dataTypes/GenerateUnion';
import { ValidationPlugin } from 'src/features/validation/ValidationPlugin';
import { CompCategory } from 'src/layout/common';
import { isNodeDefChildrenPlugin, NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { MaybeOptionalCodeGenerator } from 'src/codegen/CodeGenerator';
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
  protected plugins: NodeDefPlugin<any>[] = [];
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
      this.addPlugin(new ValidationPlugin());
    }
  }

  public setType(type: string, symbol?: string): this {
    const symbolName = symbol ?? type;
    this.type = type;
    this.typeSymbol = symbolName;
    this.inner.addProperty(new CG.prop('type', new CG.const(this.type)).insertFirst());

    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public addPlugin(plugin: NodeDefPlugin<any>): this {
    for (const existing of this.plugins) {
      if (existing.getKey() === plugin.getKey()) {
        throw new Error(`Component already has a plugin with the key ${plugin.getKey()}!`);
      }
    }

    plugin.addToComponent(this);
    this.plugins.push(plugin);
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
      this.inner.addProperty(new CG.prop('textResourceBindings', new CG.obj().optional()));
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
      .setTitle(`Summary overrides for ${this.type}`)
      .setDescription(`Properties for how to display the summary of this ${this.type} component`);

    const allComponents = new CG.obj(new CG.prop('componentType', new CG.const(this.type)))
      .extends(overrides)
      .setTitle(`Summary overrides for all ${this.type}`)
      .setDescription(`Properties for how to display the summary of all ${this.type} components`);

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
      from: `src/layout/${this.type}/config.generated.ts`,
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

  public generateConfigFile(): string {
    this.beforeFinalizing();
    // Forces the objects to register in the context and be exported via the context symbols table
    this.inner.exportAs(`Comp${this.typeSymbol}External`);
    this.inner.toTypeScript();

    const impl = new CG.import({
      import: this.typeSymbol,
      from: `./index`,
    });

    const CompCategory = new CG.import({
      import: 'CompCategory',
      from: `src/layout/common`,
    });

    const pluginUnion =
      this.plugins.length === 0
        ? 'never'
        : this.plugins
            .map((plugin) => {
              const PluginName = plugin.makeImport();
              const genericArgs = plugin.makeGenericArgs();
              return genericArgs ? `${PluginName}<${genericArgs}>` : `${PluginName}`;
            })
            .join(' | ');

    const staticElements = [
      `export function getConfig() {
         return {
           def: new ${impl.toTypeScript()}(),
           capabilities: ${JSON.stringify(this.config.capabilities, null, 2)} as const,
           behaviors: ${JSON.stringify(this.behaviors, null, 2)} as const,
         };
       }`,
      `export type TypeConfig = {
         category: ${CompCategory}.${this.config.category},
         layout: ${this.inner};
         plugins: ${pluginUnion};
         summaryOverrides: ${this.getSummaryOverridesImport('plain')?.toTypeScript() ?? 'undefined'};
         summaryOverridesWithRef: ${this.getSummaryOverrides()?.toTypeScript() ?? 'undefined'};
       }`,
    ];

    return staticElements.join('\n\n');
  }

  public generateDefClass(): string {
    const symbol = this.typeSymbol;
    const category = this.config.category;
    const categorySymbol = CategoryImports[category].toTypeScript();

    const StateFactoryProps = new CG.import({
      import: 'StateFactoryProps',
      from: 'src/utils/layout/types',
    });

    const BaseNodeData = new CG.import({
      import: 'BaseNodeData',
      from: 'src/utils/layout/types',
    });

    const ExprResolver = new CG.import({
      import: 'ExprResolver',
      from: 'src/layout/LayoutComponent',
    });

    const NodeGeneratorProps = new CG.import({
      import: 'NodeGeneratorProps',
      from: 'src/layout/LayoutComponent',
    });

    const ReactJSX = new CG.import({
      import: 'JSX',
      from: 'react',
    });

    const NodeGenerator = new CG.import({
      import: 'NodeGenerator',
      from: 'src/utils/layout/generator/NodeGenerator',
    });

    const NodeData = new CG.import({
      import: 'NodeData',
      from: 'src/utils/layout/types',
    });

    const NodesContext = new CG.import({
      import: 'NodesContext',
      from: 'src/utils/layout/NodesContext',
    });

    const DisplayData = new CG.import({
      import: 'DisplayData',
      from: 'src/features/displayData/index',
    });

    const LayoutNode = new GenerateImportedSymbol({
      import: 'LayoutNode',
      from: 'src/utils/layout/LayoutNode',
    });

    const IDataModelBindings = new CG.import({
      import: 'IDataModelBindings',
      from: 'src/layout/layout',
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

    const pluginInstances = this.plugins.map((plugin) => {
      const args = plugin.makeConstructorArgs();
      const instance = `new ${plugin.import}(${args})`;
      return `'${plugin.getKey()}': ${instance}`;
    });
    const pluginMap = pluginInstances.length ? `protected plugins = {${pluginInstances.join(',\n')}};` : '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function pluginRef(plugin: NodeDefPlugin<any>): string {
      return `this.plugins['${plugin.getKey()}']`;
    }

    const pluginStateFactories = this.plugins
      .filter((plugin) => plugin.stateFactory !== NodeDefPlugin.prototype.stateFactory)
      .map((plugin) => `...${pluginRef(plugin)}.stateFactory(props as any),`)
      .join('\n');

    const pluginGeneratorChildren = this.plugins
      .filter((plugin) => plugin.extraNodeGeneratorChildren !== NodeDefPlugin.prototype.extraNodeGeneratorChildren)
      .map((plugin) => plugin.extraNodeGeneratorChildren())
      .join('\n');

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
        abstract useDataModelBindingValidation(node: ${LayoutNode}<'${this.type}'>, bindings: ${IDataModelBindings}<'${this.type}'>): string[];`,
      );
    }

    if (
      this.hasDataModelBindings() &&
      this.config.category === CompCategory.Form &&
      this.config.functionality.displayData !== false
    ) {
      additionalMethods.push(
        `// This component has data model bindings, so it should be able to produce a display string
        abstract useDisplayData(nodeId: string): string;`,
      );
      implementsInterfaces.push(`${DisplayData}`);
    }

    const readyCheckers: string[] = [];
    for (const plugin of this.plugins) {
      const extraMethodsFromPlugin = plugin.extraMethodsInDef();
      additionalMethods.push(...extraMethodsFromPlugin);

      readyCheckers.push(`${pluginRef(plugin)}.stateIsReady(state as any, fullState)`);
    }

    if (readyCheckers.length === 0) {
      additionalMethods.push(
        `// No plugins in this component
        pluginStateIsReady(_state: ${NodeData}<'${this.type}'>): boolean {
          return true;
        }`,
      );
    } else {
      additionalMethods.push(
        `pluginStateIsReady(state: ${NodeData}<'${this.type}'>, fullState: ${NodesContext}): boolean {
          return ${readyCheckers.join(' && ')};
        }`,
      );
    }

    const childrenPlugins = this.plugins.filter((plugin) => isNodeDefChildrenPlugin(plugin));
    if (childrenPlugins.length > 0) {
      const ChildClaimerProps = new CG.import({ import: 'ChildClaimerProps', from: 'src/layout/LayoutComponent' });
      const NodeData = new CG.import({ import: 'NodeData', from: 'src/utils/layout/types' });

      const claimChildrenBody = childrenPlugins.map((plugin) =>
        `${pluginRef(plugin)}.claimChildren({
            ...props,
            claimChild: (id: string) => props.claimChild('${plugin.getKey()}', id),
         });`.trim(),
      );

      const isChildHiddenBody = childrenPlugins.map(
        (plugin) => `${pluginRef(plugin)}.isChildHidden(state as any, childId)`,
      );

      additionalMethods.push(
        `claimChildren(props: ${ChildClaimerProps}<'${this.type}'>) {
          ${claimChildrenBody.join('\n')}
        }`,
        `isChildHidden(state: ${NodeData}<'${this.type}'>, childId: string) {
          return [${isChildHiddenBody.join(', ')}].some((h) => h);
        }`,
      );
    }

    const implementing = implementsInterfaces.length ? ` implements ${implementsInterfaces.join(', ')}` : '';
    return `export abstract class ${symbol}Def extends ${categorySymbol}<'${this.type}'>${implementing} {
      protected readonly type = '${this.type}';
      ${pluginMap}

      ${this.config.directRendering ? 'directRender(): boolean { return true; }' : ''}

      renderNodeGenerator(props: ${NodeGeneratorProps}): ${ReactJSX}.Element | null {
        return (
          <${NodeGenerator} {...props}>
            ${pluginGeneratorChildren}
          </${NodeGenerator}>
        );
      }

      stateFactory(props: ${StateFactoryProps}<'${this.type}'>) {
        const baseState: ${BaseNodeData}<'${this.type}'> = {
          type: 'node',
          pageKey: props.pageKey,
          parentId: props.parentId,
          depth: props.depth,
          isValid: props.isValid,
          layout: props.item,
          hidden: undefined,
          rowIndex: props.rowIndex,
          errors: undefined,
        };

        return { ...baseState, ${pluginStateFactories} };
      }

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

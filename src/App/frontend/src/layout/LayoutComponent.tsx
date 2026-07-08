import React from 'react';
import type { JSX } from 'react';

import type { ErrorObject } from 'ajv';

import { DefaultNodeInspector } from 'src/features/devtools/components/NodeInspector/DefaultNodeInspector';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { validateEmptyFieldAllBindings } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { CompCategory } from 'src/layout/common';
import { getComponentCapabilities } from 'src/layout/index';
import { SummaryItemCompact } from 'src/layout/Summary/SummaryItemCompact';
import type { CompCapabilities } from 'src/codegen/Config';
import type { SimpleEval } from 'src/features/expressions';
import type { ExprResolved, ExprVal } from 'src/features/expressions/types';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { OptionsValueType } from 'src/features/options/useGetOptions';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentBase, FormComponentProps, SummarizableComponentProps } from 'src/layout/common.generated';
import type {
  ComponentValidationContext,
  DataModelBindingValidationContext,
  PropsFromGenericComponent,
  ValidateEmptyField,
} from 'src/layout/index';
import type {
  CompExternal,
  CompExternalExact,
  CompIntermediateExact,
  ComponentLayoutValidationProps,
  CompTypes,
  IDataModelBindings,
  ITextResourceBindingsExternal,
} from 'src/layout/layout';
import type { LegacySummaryOverrides } from 'src/layout/Summary/SummaryComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export interface ExprResolver<Type extends CompTypes> {
  item: CompIntermediateExact<Type>;
  evalBase: () => ExprResolved<Omit<ComponentBase, 'hidden'>>;
  evalFormProps: () => ExprResolved<FormComponentProps>;
  evalSummarizable: () => ExprResolved<SummarizableComponentProps>;
  evalStr: SimpleEval<ExprVal.String>;
  evalNum: SimpleEval<ExprVal.Number>;
  evalBool: SimpleEval<ExprVal.Boolean>;
  evalAny: SimpleEval<ExprVal.Any>;
  evalTrb: () => {
    textResourceBindings: ExprResolved<ITextResourceBindingsExternal<Type>>;
  };
}

export abstract class AnyComponent<Type extends CompTypes> {
  protected readonly type: Type;

  /**
   * Given properties from GenericComponent, render this layout component
   */
  abstract render:
    | ReturnType<typeof React.forwardRef<HTMLElement, PropsFromGenericComponent<Type>>>
    | ((props: PropsFromGenericComponent<Type>) => JSX.Element | null);

  renderSummary2?(props: Summary2Props): JSX.Element | null;

  /**
   * Override this if you need to implement specific validators for the layout config, or if you need to
   * validate properties that are not covered by the schema validation.
   */
  renderLayoutValidators(_props: ComponentLayoutValidationProps<Type>): JSX.Element | null {
    return null;
  }

  /**
   * The default expression evaluator, implemented by code generation. Do not try to override this yourself. If you
   * need custom expression support, set that in your component configuration.
   */
  abstract evalDefaultExpressions(props: ExprResolver<Type>): unknown;

  /**
   * Resolves all expressions in the layout configuration, and returns a new layout configuration
   * with expressions resolved. Will either be implemented using code generation (if your component has no custom
   * expressions), or must be implemented manually.
   */
  abstract evalExpressions(props: ExprResolver<Type>): unknown;

  /**
   * Given a node, a list of the node's data, for display in the devtools node inspector
   */
  renderDevToolsInspector(baseComponentId: string): JSX.Element | null {
    return <DefaultNodeInspector baseComponentId={baseComponentId} />;
  }

  /**
   * Direct render? Override this and return true if you want GenericComponent to omit rendering grid,
   * validation messages, etc.
   */
  directRender(): boolean {
    return false;
  }

  shouldRenderInAutomaticPDF(layout: CompExternal<Type>): boolean {
    return !('renderAsSummary' in layout ? layout.renderAsSummary : false);
  }

  /**
   * Return false to prevent this component from being rendered in a table
   * Should be configured as a capability in the component configuration (config.ts)
   */
  canRenderInTable() {
    return getComponentCapabilities(this.type).renderInTable;
  }

  /**
   * Should GenericComponent render validation messages for simpleBinding outside of this component?
   * This has no effect if:
   *  - Your component renders directly, using directRender()
   *  - Your component uses a different data binding (you should handle validations yourself)
   */
  renderDefaultValidations(): boolean {
    return true;
  }

  /**
   * Base implementation of validateLayoutConfig.
   * Override this if you need to use a more specific pointer or modify/filter errors before returning them.
   */
  validateLayoutConfig(
    component: CompExternalExact<Type>,
    validate: (pointer: string | null, data: unknown) => ErrorObject[] | undefined,
  ): ErrorObject[] | undefined {
    const schemaPointer = '#/definitions/AnyComponent';
    return validate(schemaPointer, component);
  }

  getOptionsEffectValueType(): OptionsValueType | undefined {
    return undefined;
  }
}

export abstract class PresentationComponent<Type extends CompTypes> extends AnyComponent<Type> {
  readonly category = CompCategory.Presentation;
}

export interface SummaryRendererProps {
  targetBaseComponentId: string;
  onChangeClick: () => void;
  changeText: string | null;
  overrides?: LegacySummaryOverrides;
}

abstract class _FormComponent<Type extends CompTypes> extends AnyComponent<Type> {
  /**
   * Render a summary for this component. For most components, this will return a:
   * <SingleInputSummary formDataAsString={displayData} />
   */
  abstract renderSummary(props: SummaryRendererProps): JSX.Element | null;

  /**
   * Lets you control if the component renders something like <SummaryBoilerplate /> first, or if the Summary should
   * handle that for you.
   */
  renderSummaryBoilerplate(): boolean {
    return true;
  }

  /**
   * When rendering a summary of a repeating group with `largeGroup: false`, every FormComponent inside each row is
   * rendered in a compact way. The default
   */
  public renderCompactSummary({ targetBaseComponentId }: SummaryRendererProps): JSX.Element | null {
    const displayData = useDisplayData(targetBaseComponentId);
    return (
      <SummaryItemCompact
        targetBaseComponentId={targetBaseComponentId}
        displayData={displayData}
      />
    );
  }

  /**
   * Return true if this component requires data model bindings to be configured
   */
  public isDataModelBindingsRequired(_baseComponentId: string, _layoutLookups: LayoutLookups): boolean {
    return true;
  }

  /**
   * Runs validation on data model bindings. Returns an array of error messages.
   */
  public validateDataModelBindings(
    _baseComponentId: string,
    _bindings: IDataModelBindings<Type>,
    _context: DataModelBindingValidationContext,
  ): string[] {
    return [];
  }
}

export abstract class ActionComponent<Type extends CompTypes> extends AnyComponent<Type> {
  readonly category = CompCategory.Action;

  shouldRenderInAutomaticPDF(_data: CompExternal<Type>): boolean {
    return false;
  }
}

export abstract class FormComponent<Type extends CompTypes>
  extends _FormComponent<Type>
  implements ValidateEmptyField<Type>
{
  readonly category = CompCategory.Form;

  validateEmptyField(ctx: ComponentValidationContext<Type>): ComponentValidation[] {
    return validateEmptyFieldAllBindings(ctx);
  }
}

export interface ChildClaimerProps<Type extends CompTypes> {
  item: CompExternal<Type>;
  claimChild: (id: string) => void;
  getType: (id: string) => CompTypes | undefined;
  getCapabilities: (type: CompTypes) => CompCapabilities;
}

export abstract class ContainerComponent<Type extends CompTypes> extends _FormComponent<Type> {
  readonly category = CompCategory.Container;

  isDataModelBindingsRequired(_baseComponentId: string, _layoutLookups: LayoutLookups): boolean {
    return false;
  }

  abstract claimChildren(props: ChildClaimerProps<Type>): void;
}

export type LayoutComponent<Type extends CompTypes = CompTypes> =
  | PresentationComponent<Type>
  | FormComponent<Type>
  | ActionComponent<Type>
  | ContainerComponent<Type>;

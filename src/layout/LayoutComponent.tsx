import React from 'react';
import type { JSX } from 'react';

import type { ErrorObject } from 'ajv';

import { DefaultNodeInspector } from 'src/features/devtools/components/NodeInspector/DefaultNodeInspector';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { useEmptyFieldValidationAllBindings } from 'src/features/validation/nodeValidation/emptyFieldValidation';
import { CompCategory } from 'src/layout/common';
import { getComponentCapabilities } from 'src/layout/index';
import { SummaryItemCompact } from 'src/layout/Summary/SummaryItemCompact';
import { NodeGenerator } from 'src/utils/layout/generator/NodeGenerator';
import type { CompCapabilities } from 'src/codegen/Config';
import type { SimpleEval } from 'src/features/expressions';
import type { ExprResolved, ExprVal } from 'src/features/expressions/types';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { ComponentValidation } from 'src/features/validation';
import type { ComponentBase, FormComponentProps, SummarizableComponentProps } from 'src/layout/common.generated';
import type { FormDataSelector, PropsFromGenericComponent, ValidateEmptyField } from 'src/layout/index';
import type {
  CompExternal,
  CompExternalExact,
  CompIntermediateExact,
  CompTypes,
  IDataModelBindings,
  ITextResourceBindingsExternal,
  NodeValidationProps,
} from 'src/layout/layout';
import type { LegacySummaryOverrides } from 'src/layout/Summary/SummaryComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { ChildClaim, ChildClaims } from 'src/utils/layout/generator/GeneratorContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { NodesContext } from 'src/utils/layout/NodesContext';
import type { NodeDefPlugin } from 'src/utils/layout/plugins/NodeDefPlugin';
import type { NodeData, StateFactoryProps } from 'src/utils/layout/types';

export interface NodeGeneratorProps {
  externalItem: CompExternalExact<CompTypes>;
  claim: ChildClaim;
  childClaims: ChildClaims | undefined;
}

export interface ExprResolver<Type extends CompTypes> {
  item: CompIntermediateExact<Type>;
  formDataSelector: FormDataSelector;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected plugins: { [key: string]: NodeDefPlugin<any> } = {};

  /**
   * Given properties from GenericComponent, render this layout component
   */
  abstract render:
    | ReturnType<typeof React.forwardRef<HTMLElement, PropsFromGenericComponent<Type>>>
    | ((props: PropsFromGenericComponent<Type>) => JSX.Element | null);

  renderSummary2?(props: Summary2Props<Type>): JSX.Element | null;

  /**
   * Render a node generator for this component. This can be overridden if you want to extend
   * the default node generator with additional functionality.
   */
  renderNodeGenerator(props: NodeGeneratorProps): JSX.Element | null {
    return <NodeGenerator {...props} />;
  }

  /**
   * Override this if you need to implement specific validators for the layout config, or if you need to
   * validate properties that are not covered by the schema validation.
   */
  renderLayoutValidators(_props: NodeValidationProps<Type>): JSX.Element | null {
    return null;
  }

  /**
   * Check if this component has a specific plugin
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public hasPlugin(constructor: new (...args: any[]) => NodeDefPlugin<any>): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Object.values(this.plugins).some((plugin: NodeDefPlugin<any>) => plugin instanceof constructor);
  }

  /**
   * This is called to figure out if the nodes state is ready to be rendered. This can be overridden to add
   * additional checks for any component.
   */
  public stateIsReady(state: NodeData<Type>): boolean {
    return state.hidden !== undefined;
  }

  /**
   * Same as the above, but implemented by plugins automatically in the generated code.
   */
  abstract pluginStateIsReady(state: NodeData<Type>, fullState: NodesContext): boolean;

  /**
   * Creates the zustand store default state for a node of this component type. Usually this is implemented
   * automatically by code generation, but you can override it if you need to add additional properties to the state.
   */
  abstract stateFactory(props: StateFactoryProps): unknown;

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
  renderDevToolsInspector(node: LayoutNode<Type>): JSX.Element | null {
    return <DefaultNodeInspector node={node} />;
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
}

export abstract class PresentationComponent<Type extends CompTypes> extends AnyComponent<Type> {
  readonly category = CompCategory.Presentation;
}

export interface SummaryRendererProps<Type extends CompTypes> {
  targetNode: LayoutNode<Type>;
  onChangeClick: () => void;
  changeText: string | null;
  overrides?: LegacySummaryOverrides;
}

abstract class _FormComponent<Type extends CompTypes> extends AnyComponent<Type> {
  /**
   * Render a summary for this component. For most components, this will return a:
   * <SingleInputSummary formDataAsString={displayData} />
   */
  abstract renderSummary(props: SummaryRendererProps<Type>): JSX.Element | null;

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
  public renderCompactSummary({ targetNode }: SummaryRendererProps<Type>): JSX.Element | null {
    const displayData = useDisplayData(targetNode);
    return (
      <SummaryItemCompact
        targetNode={targetNode}
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
  public useDataModelBindingValidation(_baseComponentId: string, _bindings: IDataModelBindings<Type>): string[] {
    return [];
  }
}

export abstract class ActionComponent<Type extends CompTypes> extends AnyComponent<Type> {
  readonly category = CompCategory.Action;

  shouldRenderInAutomaticPDF(_data: CompExternal<Type>): boolean {
    return false;
  }
}

export abstract class FormComponent<Type extends CompTypes> extends _FormComponent<Type> implements ValidateEmptyField {
  readonly category = CompCategory.Form;

  useEmptyFieldValidation(baseComponentId: string): ComponentValidation[] {
    return useEmptyFieldValidationAllBindings(baseComponentId);
  }
}

export interface ChildClaimerProps<Type extends CompTypes> {
  item: CompExternal<Type>;
  claimChild: (pluginKey: string, id: string) => void;
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

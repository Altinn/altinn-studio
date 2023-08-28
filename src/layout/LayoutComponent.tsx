import React from 'react';

import { DefaultNodeInspector } from 'src/features/devtools/components/NodeInspector/DefaultNodeInspector';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { CompCategory } from 'src/layout/common';
import {
  type DisplayData,
  type DisplayDataProps,
  type EmptyFieldValidation,
  getDisplayDataPropsFromState,
  type PropsFromGenericComponent,
  type SchemaValidation,
} from 'src/layout/index';
import { SummaryItemCompact } from 'src/layout/Summary/SummaryItemCompact';
import { getFieldName } from 'src/utils/formComponentUtils';
import { SimpleComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import { buildValidationObject } from 'src/utils/validation/validationHelpers';
import type { IFormData } from 'src/features/formData';
import type { CompInternal, CompTypes, HierarchyDataSources, ITextResourceBindings } from 'src/layout/layout';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { ISchemaValidationError } from 'src/utils/validation/schemaValidation';
import type { IValidationContext, IValidationObject } from 'src/utils/validation/types';

const defaultGenerator = new SimpleComponentHierarchyGenerator();

export abstract class AnyComponent<Type extends CompTypes> {
  /**
   * Given properties from GenericComponent, render this layout component
   */
  abstract render(props: PropsFromGenericComponent<Type>): JSX.Element | null;

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
  directRender(_props: PropsFromGenericComponent<Type>): boolean {
    return false;
  }

  shouldRenderInAutomaticPDF(node: LayoutNode<Type>): boolean {
    if (!('renderAsSummary' in node.item)) {
      return true;
    }

    return !node.item.renderAsSummary;
  }

  /**
   * Return false to prevent this component from being rendered in a table
   * Should be configured as a capability in the component configuration (config.ts)
   */
  abstract canRenderInTable(): boolean;

  /**
   * Return true to allow this component to be rendered in a ButtonGroup
   * Should be configured as a capability in the component configuration (config.ts)
   */
  abstract canRenderInButtonGroup(): boolean;

  /**
   * Return true to allow this component to be rendered in an Accordion
   */
  abstract canRenderInAccordion(): boolean;

  /**
   * Return true to allow this component to be rendered in an AccordionGroup
   */
  abstract canRenderInAccordionGroup(): boolean;

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
   * Returns a new instance of a class to perform the component hierarchy generation process
   * @see HierarchyGenerator
   */
  hierarchyGenerator(): ComponentHierarchyGenerator<Type> {
    return defaultGenerator;
  }

  makeNode(
    item: CompInternal<Type>,
    parent: LayoutNode | LayoutPage,
    top: LayoutPage,
    dataSources: HierarchyDataSources,
    rowIndex?: number,
  ): LayoutNode<Type> {
    return new BaseLayoutNode(item, parent, top, dataSources, rowIndex) as LayoutNode<Type>;
  }
}

export abstract class PresentationComponent<Type extends CompTypes> extends AnyComponent<Type> {
  readonly type = CompCategory.Presentation;
}

export interface SummaryRendererProps<Type extends CompTypes> {
  summaryNode: LayoutNode<'Summary'>;
  targetNode: LayoutNode<Type>;
  onChangeClick: () => void;
  changeText: string | null;
  overrides?: ISummaryComponent['overrides'];
}

abstract class _FormComponent<Type extends CompTypes> extends AnyComponent<Type> implements DisplayData<Type> {
  /**
   * Given a node (with group-index-aware data model bindings), this method should return a proper 'value' for the
   * current component/node. This value will be used to display form data in a repeating group table, and when rendering
   * a Summary for the node inside a repeating group. It will probably also be useful when implementing renderSummary().
   * @see renderSummary
   * @see renderCompactSummary
   */
  abstract getDisplayData(node: LayoutNode<Type>, displayDataProps: DisplayDataProps): string;

  useDisplayData(node: LayoutNode<Type>): string {
    const displayDataProps = useAppSelector(getDisplayDataPropsFromState);
    return this.getDisplayData(node, displayDataProps);
  }

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
    const displayData = this.useDisplayData(targetNode);
    return (
      <SummaryItemCompact
        targetNode={targetNode}
        displayData={displayData}
      />
    );
  }
}

export abstract class ActionComponent<Type extends CompTypes> extends AnyComponent<Type> {
  readonly type = CompCategory.Action;

  shouldRenderInAutomaticPDF() {
    return false;
  }
}

export abstract class FormComponent<Type extends CompTypes>
  extends _FormComponent<Type>
  implements EmptyFieldValidation, SchemaValidation
{
  readonly type = CompCategory.Form;

  runEmptyFieldValidation(
    node: LayoutNode<Type>,
    { formData, langTools }: IValidationContext,
    overrideFormData?: IFormData,
  ): IValidationObject[] {
    if (!('required' in node.item) || !node.item.required) {
      return [];
    }
    const { langAsString } = langTools;

    const formDataToValidate = { ...formData, ...overrideFormData };
    const validationObjects: IValidationObject[] = [];

    const bindings = Object.entries(node.item.dataModelBindings || {});
    for (const [bindingKey, _field] of bindings) {
      const field = _field as string;
      const data = formDataToValidate[field];
      const trb: ITextResourceBindings = 'textResourceBindings' in node.item ? node.item.textResourceBindings : {};

      if (!data?.length) {
        const fieldName = getFieldName(trb, langTools, bindingKey);
        const errorMessage =
          trb && 'requiredValidation' in trb && trb.requiredValidation
            ? langAsString(trb?.requiredValidation, [fieldName])
            : langAsString('form_filler.error_required', [fieldName]);

        validationObjects.push(buildValidationObject(node, 'errors', errorMessage, bindingKey));
      }
    }
    return validationObjects;
  }

  runSchemaValidation(node: LayoutNode<Type>, schemaErrors: ISchemaValidationError[]): IValidationObject[] {
    const validationObjects: IValidationObject[] = [];
    for (const error of schemaErrors) {
      if ('dataModelBindings' in node.item && node.item.dataModelBindings) {
        const bindings = Object.entries(node.item.dataModelBindings);
        for (const [bindingKey, bindingField] of bindings) {
          if (bindingField === error.bindingField) {
            validationObjects.push(
              buildValidationObject(node, 'errors', error.message, bindingKey, error.invalidDataType),
            );
          }
        }
      }
    }
    return validationObjects;
  }
}

export abstract class ContainerComponent<Type extends CompTypes> extends _FormComponent<Type> {
  readonly type = CompCategory.Container;
}

export type LayoutComponent<Type extends CompTypes = CompTypes> =
  | PresentationComponent<Type>
  | FormComponent<Type>
  | ActionComponent<Type>
  | ContainerComponent<Type>;

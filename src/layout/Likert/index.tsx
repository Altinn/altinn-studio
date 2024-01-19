import React from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent, ValidateAny } from '..';

import { runAllValidations } from 'src/layout/componentValidation';
import { LikertDef } from 'src/layout/Likert/config.def.generated';
import { LikertHierarchyGenerator } from 'src/layout/Likert/hierarchy';
import { LikertComponent } from 'src/layout/Likert/LikertComponent';
import { LikertSummary } from 'src/layout/Likert/Summary/LikertSummary';
import { type LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type {
  ComponentValidation,
  FormValidations,
  ISchemaValidationError,
  ValidationDataSources,
} from 'src/features/validation';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';

export class Likert extends LikertDef implements ValidateAny {
  private _hierarchyGenerator = new LikertHierarchyGenerator();

  directRender(): boolean {
    return true;
  }

  render(props: PropsFromGenericComponent<'Likert'>): JSX.Element | null {
    return <LikertComponent {...props} />;
  }

  renderSummary({
    onChangeClick,
    changeText,
    summaryNode,
    targetNode,
    overrides,
  }: SummaryRendererProps<'Likert'>): JSX.Element | null {
    return (
      <LikertSummary
        onChangeClick={onChangeClick}
        changeText={changeText}
        summaryNode={summaryNode}
        targetNode={targetNode}
        overrides={overrides}
      />
    );
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  getDisplayData(): string {
    return '';
  }

  hierarchyGenerator(): ComponentHierarchyGenerator<'Likert'> {
    return this._hierarchyGenerator;
  }

  runValidations(
    node: LayoutNode,
    ctx: ValidationDataSources,
    schemaErrors: ISchemaValidationError[],
  ): FormValidations {
    return runAllValidations(node, ctx, schemaErrors);
  }

  // This component does not have empty field validation, so has to override its inherited method
  runEmptyFieldValidation(): ComponentValidation[] {
    return [];
  }

  isDataModelBindingsRequired(): boolean {
    return true;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Likert'>): string[] {
    const [errors, result] = this.validateDataModelBindingsAny(ctx, 'Likert', ['array']);
    if (errors) {
      return errors;
    }

    if (result) {
      const innerType = Array.isArray(result.items) ? result.items[0] : result.items;
      if (!innerType || typeof innerType !== 'object' || !innerType.type || innerType.type !== 'object') {
        return [`Likert-datamodellbindingen peker mot en ukjent type i datamodellen`];
      }
    }

    return [];
  }
}

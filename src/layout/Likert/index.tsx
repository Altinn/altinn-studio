import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent } from '..';

import { LikertDef } from 'src/layout/Likert/config.def.generated';
import { LikertHierarchyGenerator } from 'src/layout/Likert/hierarchy';
import { LikertComponent } from 'src/layout/Likert/LikertComponent';
import { LikertSummary } from 'src/layout/Likert/Summary/LikertSummary';
import type { LayoutValidationCtx } from 'src/features/devtools/layoutValidation/types';
import type { ComponentValidation } from 'src/features/validation';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';

export class Likert extends LikertDef {
  private _hierarchyGenerator = new LikertHierarchyGenerator();

  directRender(): boolean {
    return true;
  }

  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Likert'>>(
    function LayoutComponentLikertRender(props, _): JSX.Element | null {
      return <LikertComponent {...props} />;
    },
  );

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

  // This component does not have empty field validation, so has to override its inherited method
  runEmptyFieldValidation(): ComponentValidation[] {
    return [];
  }

  isDataModelBindingsRequired(): boolean {
    return true;
  }

  validateDataModelBindings(ctx: LayoutValidationCtx<'Likert'>): string[] {
    const [questionsErr, questions] = this.validateDataModelBindingsAny(ctx, 'questions', ['array']);
    const errors: string[] = [...(questionsErr || [])];

    if (
      questions &&
      (!questions.items ||
        typeof questions.items !== 'object' ||
        Array.isArray(questions.items) ||
        questions.items.type !== 'object')
    ) {
      errors.push(`questions-datamodellbindingen peker mot en ukjent type i datamodellen (forventet type: object)`);
    }

    return errors;
  }
}

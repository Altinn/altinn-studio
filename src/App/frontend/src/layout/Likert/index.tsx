import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent } from '..';

import { FormStore } from 'src/features/form/FormContext';
import { LikertDef } from 'src/layout/Likert/config.def.generated';
import { LikertComponent } from 'src/layout/Likert/LikertComponent';
import { makeLikertChildId } from 'src/layout/Likert/makeLikertChildId';
import { LikertSummaryComponent } from 'src/layout/Likert/Summary/LikertSummaryComponent';
import { LikertSummary } from 'src/layout/Likert/Summary2/LikertSummary';
import { validateDataModelBindingsAny } from 'src/utils/layout/validation/hooks';
import type { ComponentValidation } from 'src/features/validation';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ChildClaimerProps, ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Likert extends LikertDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Likert'>>(
    function LayoutComponentLikertRender(props, _): JSX.Element | null {
      return <LikertComponent {...props} />;
    },
  );

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    return <LikertSummaryComponent {...props} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return <LikertSummary {...props} />;
  }

  // This component does not have empty field validation, so has to override its inherited method
  validateEmptyField(): ComponentValidation[] {
    return [];
  }

  isDataModelBindingsRequired(): boolean {
    return true;
  }

  useDataModelBindingValidation(baseComponentId: string, bindings: IDataModelBindings<'Likert'>): string[] {
    const lookupBinding = FormStore.bootstrap.useLookupBinding();
    const layoutLookups = FormStore.bootstrap.useLayoutLookups();
    const [questionsErr, questions] = validateDataModelBindingsAny(
      baseComponentId,
      bindings,
      lookupBinding,
      layoutLookups,
      'questions',
      ['array'],
    );
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

  evalExpressions(props: ExprResolver<'Likert'>) {
    return {
      ...this.evalDefaultExpressions(props),
      required: props.evalBool(props.item.required, false),
      readOnly: props.evalBool(props.item.readOnly, false),
    };
  }

  getOptionsEffectValueType() {
    return 'single' as const;
  }

  claimChildren(props: ChildClaimerProps<'Likert'>): void {
    props.claimChild(makeLikertChildId(props.item.id));
  }
}

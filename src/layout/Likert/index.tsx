import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import type { PropsFromGenericComponent } from '..';

import { DataModels } from 'src/features/datamodel/DataModelsProvider';
import { LikertDef } from 'src/layout/Likert/config.def.generated';
import { LikertComponent } from 'src/layout/Likert/LikertComponent';
import { LikertSummaryComponent } from 'src/layout/Likert/Summary/LikertSummaryComponent';
import { LikertSummary } from 'src/layout/Likert/Summary2/LikertSummary';
import { validateDataModelBindingsAny } from 'src/utils/layout/generator/validation/hooks';
import type { ComponentValidation } from 'src/features/validation';
import type { IDataModelBindings } from 'src/layout/layout';
import type { ExprResolver, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export class Likert extends LikertDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Likert'>>(
    function LayoutComponentLikertRender(props, _): JSX.Element | null {
      return <LikertComponent {...props} />;
    },
  );

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  renderSummary(props: SummaryRendererProps<'Likert'>): JSX.Element | null {
    return <LikertSummaryComponent {...props} />;
  }

  renderSummary2(props: Summary2Props<'Likert'>): JSX.Element | null {
    return <LikertSummary {...props} />;
  }

  // This component does not have empty field validation, so has to override its inherited method
  useEmptyFieldValidation(): ComponentValidation[] {
    return [];
  }

  isDataModelBindingsRequired(): boolean {
    return true;
  }

  useDataModelBindingValidation(node: LayoutNode<'Likert'>, bindings: IDataModelBindings<'Likert'>): string[] {
    const lookupBinding = DataModels.useLookupBinding();
    const [questionsErr, questions] = validateDataModelBindingsAny(node, bindings, lookupBinding, 'questions', [
      'array',
    ]);
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
}

import React, { forwardRef, type JSX } from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { ValidateSigningTaskType } from 'src/layout/SigningActions/ValidateSigningTaskType';
import { SigningDocumentListDef } from 'src/layout/SigningDocumentList/config.def.generated';
import { SigningDocumentListComponent } from 'src/layout/SigningDocumentList/SigningDocumentListComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression, useEvalExpressionMap } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ComponentLayoutValidationProps } from 'src/layout/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class SigningDocumentList extends SigningDocumentListDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'SigningDocumentList'>>(
    function SigningDocumentListComponentRender(props, _): JSX.Element | null {
      const config = useComponentConfig(props.baseComponentId, 'SigningDocumentList');
      const textResourceBindings = useEvalExpressionMap(
        config.textResourceBindings,
        Expressions.SigningDocumentList.textResourceBindings,
      );
      return (
        <SigningDocumentListComponent
          baseComponentId={props.baseComponentId}
          textResourceBindings={textResourceBindings}
        />
      );
    },
  );

  renderLayoutValidators(props: ComponentLayoutValidationProps<'SigningDocumentList'>): JSX.Element | null {
    return <ValidateSigningTaskType {...props} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    const config = useComponentConfig(targetBaseComponentId, 'SigningDocumentList');
    const summaryTitle = useEvalExpression(
      config.textResourceBindings?.summaryTitle,
      Expressions.SigningDocumentList.textResourceBindings.summaryTitle,
    );
    const title = useEvalExpression(
      config.textResourceBindings?.title,
      Expressions.SigningDocumentList.textResourceBindings.title,
    );
    const help = useEvalExpression(
      config.textResourceBindings?.help,
      Expressions.SigningDocumentList.textResourceBindings.help,
    );
    const summaryHeading =
      (config.textResourceBindings?.summaryTitle === undefined ? undefined : summaryTitle) ??
      (config.textResourceBindings?.title === undefined ? undefined : title) ??
      'signing_document_list_summary.header';

    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.SomeUserContent}
      >
        <SigningDocumentListComponent
          baseComponentId={targetBaseComponentId}
          textResourceBindings={{
            title: summaryHeading,
            help,
            description: undefined,
          }}
        />
      </SummaryFlex>
    );
  }
}

import React, { forwardRef, type JSX } from 'react';

import { ValidateSigningTaskType } from 'src/layout/SigningActions/ValidateSigningTaskType';
import { SigningDocumentListDef } from 'src/layout/SigningDocumentList/config.def.generated';
import { SigningDocumentListComponent } from 'src/layout/SigningDocumentList/SigningDocumentListComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class SigningDocumentList extends SigningDocumentListDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'SigningDocumentList'>>(
    function SigningDocumentListComponentRender(props, _): JSX.Element | null {
      const { textResourceBindings } = useItemWhenType(props.baseComponentId, 'SigningDocumentList');
      return <SigningDocumentListComponent textResourceBindings={textResourceBindings} />;
    },
  );

  renderLayoutValidators(props: NodeValidationProps<'SigningDocumentList'>): JSX.Element | null {
    return <ValidateSigningTaskType {...props} />;
  }

  renderSummary2({ targetBaseComponentId }: Summary2Props): JSX.Element | null {
    const { textResourceBindings } = useItemWhenType(targetBaseComponentId, 'SigningDocumentList');

    return (
      <SummaryFlex
        targetBaseId={targetBaseComponentId}
        content={SummaryContains.SomeUserContent}
      >
        <SigningDocumentListComponent
          textResourceBindings={{
            ...textResourceBindings,
            title:
              textResourceBindings?.summaryTitle ??
              textResourceBindings?.title ??
              'signing_document_list_summary.header',
            description: undefined,
          }}
        />
      </SummaryFlex>
    );
  }
}

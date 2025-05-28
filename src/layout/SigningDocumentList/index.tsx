import React, { forwardRef, type JSX } from 'react';

import { useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { SigningDocumentListDef } from 'src/layout/SigningDocumentList/config.def.generated';
import { SigningDocumentListComponent } from 'src/layout/SigningDocumentList/SigningDocumentListComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { ProcessTaskType } from 'src/types';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';
import type { NodeValidationProps } from 'src/layout/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class SigningDocumentList extends SigningDocumentListDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'SigningDocumentList'>>(
    function SigningDocumentListComponentRender(props, _): JSX.Element | null {
      const textResourceBindings = useNodeItem(props.node, (i) => i.textResourceBindings);
      return <SigningDocumentListComponent textResourceBindings={textResourceBindings} />;
    },
  );

  renderLayoutValidators(_props: NodeValidationProps<'SigningDocumentList'>): JSX.Element | null {
    const taskType = useTaskTypeFromBackend();
    const addError = NodesInternal.useAddError();
    const { langAsString } = useLanguage();

    if (taskType !== ProcessTaskType.Signing) {
      const error = langAsString('signing.wrong_task_error', ['SigningDocumentList']);
      addError(error, _props.node);
      window.logErrorOnce(`Validation error for '${_props.node.id}': ${error}`);
    }

    return null;
  }

  renderSummary2({ target }: Summary2Props<'SigningDocumentList'>): JSX.Element | null {
    const textResourceBindings = useNodeItem(target, (i) => i.textResourceBindings);

    return (
      <SummaryFlex
        target={target}
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

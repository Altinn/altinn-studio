import React, { useEffect, useState } from 'react';

import { Button } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { Lang } from 'src/features/language/Lang';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';

type AwaitingOtherSignaturesPanelProps = {
  baseComponentId: string;
  hasSigned: boolean;
};

export function AwaitingOtherSignaturesPanel({ baseComponentId, hasSigned }: AwaitingOtherSignaturesPanelProps) {
  const config = useComponentConfig(baseComponentId, 'SigningActions');
  const awaitingOtherSignaturesPanelTitle = useEvalExpression(
    config.textResourceBindings?.awaitingOtherSignaturesPanelTitle,
    Expressions.SigningActions.textResourceBindings.awaitingOtherSignaturesPanelTitle,
  );
  const awaitingOtherSignaturesPanelDescriptionNotSigning = useEvalExpression(
    config.textResourceBindings?.awaitingOtherSignaturesPanelDescriptionNotSigning,
    Expressions.SigningActions.textResourceBindings.awaitingOtherSignaturesPanelDescriptionNotSigning,
  );
  const awaitingOtherSignaturesPanelDescriptionSigned = useEvalExpression(
    config.textResourceBindings?.awaitingOtherSignaturesPanelDescriptionSigned,
    Expressions.SigningActions.textResourceBindings.awaitingOtherSignaturesPanelDescriptionSigned,
  );

  const [userTriedToSubmit, setUserTriedToSubmit] = useState<boolean>(false);

  useEffect(() => {
    if (userTriedToSubmit) {
      // remove error message after 10 seconds
      const timer = setTimeout(() => {
        setUserTriedToSubmit(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [userTriedToSubmit]);

  const heading =
    (config.textResourceBindings?.awaitingOtherSignaturesPanelTitle === undefined
      ? undefined
      : awaitingOtherSignaturesPanelTitle) ?? 'signing.awaiting_other_signatures_panel_title';
  const descriptionNotSigning =
    (config.textResourceBindings?.awaitingOtherSignaturesPanelDescriptionNotSigning === undefined
      ? undefined
      : awaitingOtherSignaturesPanelDescriptionNotSigning) ??
    'signing.awaiting_other_signatures_panel_description_not_signing';
  const descriptionSigned =
    (config.textResourceBindings?.awaitingOtherSignaturesPanelDescriptionSigned === undefined
      ? undefined
      : awaitingOtherSignaturesPanelDescriptionSigned) ?? 'signing.awaiting_other_signatures_panel_description_signed';
  const errorMessage = 'signing.awaiting_other_signatures_panel_error_message';

  return (
    <SigningPanel
      baseComponentId={baseComponentId}
      variant={hasSigned ? 'success' : 'info'}
      heading={<Lang id={heading} />}
      description={<Lang id={hasSigned ? descriptionSigned : descriptionNotSigning} />}
      errorMessage={userTriedToSubmit ? <Lang id={errorMessage} /> : undefined}
      actionButton={
        <Button
          size='md'
          color='success'
          onClick={() => setUserTriedToSubmit(true)}
        >
          <Lang id='signing.submit_button' />
        </Button>
      }
    />
  );
}

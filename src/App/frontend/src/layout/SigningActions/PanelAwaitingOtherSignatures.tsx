import React, { useEffect, useState } from 'react';

import { Button } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { Lang } from 'src/features/language/Lang';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';

type AwaitingOtherSignaturesPanelProps = {
  baseComponentId: string;
  hasSigned: boolean;
};

export function AwaitingOtherSignaturesPanel({ baseComponentId, hasSigned }: AwaitingOtherSignaturesPanelProps) {
  const config = useComponentConfig(baseComponentId, 'SigningActions');
  const awaitingOtherSignaturesPanelTitle = useEvalOptionalText(
    config.textResourceBindings?.awaitingOtherSignaturesPanelTitle,
    Expressions.SigningActions.textResourceBindings.awaitingOtherSignaturesPanelTitle,
  );
  const awaitingOtherSignaturesPanelDescriptionNotSigning = useEvalOptionalText(
    config.textResourceBindings?.awaitingOtherSignaturesPanelDescriptionNotSigning,
    Expressions.SigningActions.textResourceBindings.awaitingOtherSignaturesPanelDescriptionNotSigning,
  );
  const awaitingOtherSignaturesPanelDescriptionSigned = useEvalOptionalText(
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

  const heading = awaitingOtherSignaturesPanelTitle ?? 'signing.awaiting_other_signatures_panel_title';
  const descriptionNotSigning =
    awaitingOtherSignaturesPanelDescriptionNotSigning ??
    'signing.awaiting_other_signatures_panel_description_not_signing';
  const descriptionSigned =
    awaitingOtherSignaturesPanelDescriptionSigned ?? 'signing.awaiting_other_signatures_panel_description_signed';
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

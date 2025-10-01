import React, { useEffect, useState } from 'react';

import { Button } from 'src/app-components/Button/Button';
import { Lang } from 'src/features/language/Lang';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

type AwaitingOtherSignaturesPanelProps = {
  baseComponentId: string;
  hasSigned: boolean;
};

export function AwaitingOtherSignaturesPanel({ baseComponentId, hasSigned }: AwaitingOtherSignaturesPanelProps) {
  const { textResourceBindings } = useItemWhenType(baseComponentId, 'SigningActions');
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
    textResourceBindings?.awaitingOtherSignaturesPanelTitle ?? 'signing.awaiting_other_signatures_panel_title';
  const descriptionNotSigning =
    textResourceBindings?.awaitingOtherSignaturesPanelDescriptionNotSigning ??
    'signing.awaiting_other_signatures_panel_description_not_signing';
  const descriptionSigned =
    textResourceBindings?.awaitingOtherSignaturesPanelDescriptionSigned ??
    'signing.awaiting_other_signatures_panel_description_signed';
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

import React, { useEffect, useState } from 'react';

import { Button } from 'src/app-components/Button/Button';
import { Lang } from 'src/features/language/Lang';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type AwaitingOtherSignaturesPanelProps = {
  node: LayoutNode<'SigningActions'>;
  hasSigned: boolean;
};

export function AwaitingOtherSignaturesPanel({ node, hasSigned }: AwaitingOtherSignaturesPanelProps) {
  const textResourceBindings = useNodeItem(node, (i) => i.textResourceBindings);
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
      node={node}
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

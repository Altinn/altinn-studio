import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { SubmitSigningButton } from 'src/layout/SigningActions/SubmitSigningButton';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

type SubmitPanelProps = {
  baseComponentId: string;
};

export function SubmitPanel({ baseComponentId }: SubmitPanelProps) {
  const { textResourceBindings } = useItemWhenType(baseComponentId, 'SigningActions');

  const titleReadyForSubmit = textResourceBindings?.submitPanelTitle ?? 'signing.submit_panel_title';
  const descriptionReadyForSubmit = textResourceBindings?.submitPanelDescription ?? 'signing.submit_panel_description';
  const submitButtonText = textResourceBindings?.submitButton ?? 'signing.submit_button';

  return (
    <SigningPanel
      baseComponentId={baseComponentId}
      variant='success'
      heading={<Lang id={titleReadyForSubmit} />}
      description={
        <Lang
          id={descriptionReadyForSubmit}
          params={[
            <Lang
              key='submitButtonText'
              id={submitButtonText}
            />,
          ]}
        />
      }
      actionButton={<SubmitSigningButton baseComponentId={baseComponentId} />}
    />
  );
}

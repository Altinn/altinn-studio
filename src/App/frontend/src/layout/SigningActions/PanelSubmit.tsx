import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { Lang } from 'src/features/language/Lang';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { SubmitSigningButton } from 'src/layout/SigningActions/SubmitSigningButton';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';

type SubmitPanelProps = {
  baseComponentId: string;
};

export function SubmitPanel({ baseComponentId }: SubmitPanelProps) {
  const config = useComponentConfig(baseComponentId, 'SigningActions');
  const submitPanelTitle = useEvalOptionalText(
    config.textResourceBindings?.submitPanelTitle,
    Expressions.SigningActions.textResourceBindings.submitPanelTitle,
  );
  const submitPanelDescription = useEvalOptionalText(
    config.textResourceBindings?.submitPanelDescription,
    Expressions.SigningActions.textResourceBindings.submitPanelDescription,
  );
  const submitButton = useEvalOptionalText(
    config.textResourceBindings?.submitButton,
    Expressions.SigningActions.textResourceBindings.submitButton,
  );

  const titleReadyForSubmit = submitPanelTitle ?? 'signing.submit_panel_title';
  const descriptionReadyForSubmit = submitPanelDescription ?? 'signing.submit_panel_description';
  const submitButtonText = submitButton ?? 'signing.submit_button';

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

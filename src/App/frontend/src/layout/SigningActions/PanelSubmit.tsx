import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { Lang } from 'src/features/language/Lang';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import { SubmitSigningButton } from 'src/layout/SigningActions/SubmitSigningButton';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';

type SubmitPanelProps = {
  baseComponentId: string;
};

export function SubmitPanel({ baseComponentId }: SubmitPanelProps) {
  const config = useComponentConfig(baseComponentId, 'SigningActions');
  const submitPanelTitle = useEvalExpression(
    config.textResourceBindings?.submitPanelTitle,
    Expressions.SigningActions.textResourceBindings.submitPanelTitle,
  );
  const submitPanelDescription = useEvalExpression(
    config.textResourceBindings?.submitPanelDescription,
    Expressions.SigningActions.textResourceBindings.submitPanelDescription,
  );
  const submitButton = useEvalExpression(
    config.textResourceBindings?.submitButton,
    Expressions.SigningActions.textResourceBindings.submitButton,
  );

  const titleReadyForSubmit =
    (config.textResourceBindings?.submitPanelTitle === undefined ? undefined : submitPanelTitle) ??
    'signing.submit_panel_title';
  const descriptionReadyForSubmit =
    (config.textResourceBindings?.submitPanelDescription === undefined ? undefined : submitPanelDescription) ??
    'signing.submit_panel_description';
  const submitButtonText =
    (config.textResourceBindings?.submitButton === undefined ? undefined : submitButton) ?? 'signing.submit_button';

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

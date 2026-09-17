import React from 'react';

import { Button } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Link } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import classes from 'src/layout/SigningActions/SigningActions.module.css';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import { getMessageBoxUrl } from 'src/utils/urls/urlHelper';

type NoActionRequiredPanelProps = {
  baseComponentId: string;
  hasSigned: boolean;
};

export function NoActionRequiredPanel({ baseComponentId, hasSigned }: NoActionRequiredPanelProps) {
  const currentUserPartyId = useProfile()?.partyId;
  const config = useComponentConfig(baseComponentId, 'SigningActions');
  const noActionRequiredPanelTitleHasSigned = useEvalOptionalText(
    config.textResourceBindings?.noActionRequiredPanelTitleHasSigned,
    Expressions.SigningActions.textResourceBindings.noActionRequiredPanelTitleHasSigned,
  );
  const noActionRequiredPanelTitleNotSigned = useEvalOptionalText(
    config.textResourceBindings?.noActionRequiredPanelTitleNotSigned,
    Expressions.SigningActions.textResourceBindings.noActionRequiredPanelTitleNotSigned,
  );
  const noActionRequiredPanelDescriptionHasSigned = useEvalOptionalText(
    config.textResourceBindings?.noActionRequiredPanelDescriptionHasSigned,
    Expressions.SigningActions.textResourceBindings.noActionRequiredPanelDescriptionHasSigned,
  );
  const noActionRequiredPanelDescriptionNotSigned = useEvalOptionalText(
    config.textResourceBindings?.noActionRequiredPanelDescriptionNotSigned,
    Expressions.SigningActions.textResourceBindings.noActionRequiredPanelDescriptionNotSigned,
  );
  const noActionRequiredButton = useEvalOptionalText(
    config.textResourceBindings?.noActionRequiredButton,
    Expressions.SigningActions.textResourceBindings.noActionRequiredButton,
  );

  const titleHasSigned = noActionRequiredPanelTitleHasSigned ?? 'signing.no_action_required_panel_title_has_signed';
  const titleNotSigned = noActionRequiredPanelTitleNotSigned ?? 'signing.no_action_required_panel_title_not_signed';
  const descriptionHasSigned =
    noActionRequiredPanelDescriptionHasSigned ?? 'signing.no_action_required_panel_description_has_signed';
  const descriptionNotSigned =
    noActionRequiredPanelDescriptionNotSigned ?? 'signing.no_action_required_panel_description_not_signed';
  const goToInboxButton = noActionRequiredButton ?? 'signing.no_action_required_button';

  return (
    <SigningPanel
      baseComponentId={baseComponentId}
      variant={hasSigned ? 'success' : 'info'}
      heading={<Lang id={hasSigned ? titleHasSigned : titleNotSigned} />}
      description={<Lang id={hasSigned ? descriptionHasSigned : descriptionNotSigned} />}
      actionButton={
        <Button
          color='first'
          size='md'
          asChild
        >
          <Link
            href={getMessageBoxUrl(currentUserPartyId) ?? '#'}
            className={classes.buttonLink}
          >
            <Lang id={goToInboxButton} />
          </Link>
        </Button>
      }
    />
  );
}

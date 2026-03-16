import React from 'react';

import { Link } from '@digdir/designsystemet-react';

import { Button } from 'src/app-components/Button/Button';
import { Lang } from 'src/features/language/Lang';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { SigningPanel } from 'src/layout/SigningActions/PanelSigning';
import classes from 'src/layout/SigningActions/SigningActions.module.css';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { getMessageBoxUrl } from 'src/utils/urls/urlHelper';

type NoActionRequiredPanelProps = {
  baseComponentId: string;
  hasSigned: boolean;
};

export function NoActionRequiredPanel({ baseComponentId, hasSigned }: NoActionRequiredPanelProps) {
  const currentUserPartyId = useProfile()?.partyId;
  const { textResourceBindings } = useItemWhenType(baseComponentId, 'SigningActions');

  const titleHasSigned =
    textResourceBindings?.noActionRequiredPanelTitleHasSigned ?? 'signing.no_action_required_panel_title_has_signed';
  const titleNotSigned =
    textResourceBindings?.noActionRequiredPanelTitleNotSigned ?? 'signing.no_action_required_panel_title_not_signed';
  const descriptionHasSigned =
    textResourceBindings?.noActionRequiredPanelDescriptionHasSigned ??
    'signing.no_action_required_panel_description_has_signed';
  const descriptionNotSigned =
    textResourceBindings?.noActionRequiredPanelDescriptionNotSigned ??
    'signing.no_action_required_panel_description_not_signed';
  const goToInboxButton = textResourceBindings?.noActionRequiredButton ?? 'signing.no_action_required_button';

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

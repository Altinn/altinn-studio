import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioParagraph } from '@studio/components';
import { useFiksArkivProcessShape } from './useFiksArkivProcessShape';

/**
 * The warning a Fiks Arkiv task gets when the process around it would stop the app from starting.
 *
 * The palette creates the task on its own, so one click is enough to produce an app that refuses to
 * boot, and the refusal happens in a log the developer reads long after leaving this panel. The two
 * failures are told apart because the repair differs: one asks for a gateway, the other for a
 * second flow out of a gateway that is already there.
 *
 * Nothing is offered as a button. A task dropped from the palette is connected to nothing, so there
 * is no next element for an appended gateway to route to, and Studio would leave two flows hanging
 * in empty space to be tidied up by hand.
 */
export const FiksArkivProcessShapeAlert = (): ReactElement | null => {
  const { t } = useTranslation();
  const issue = useFiksArkivProcessShape();

  if (!issue) return null;

  return (
    <StudioAlert data-color='warning'>
      <StudioParagraph data-size='sm'>
        {issue.kind === 'missingGateway'
          ? t('process_editor.configuration_panel.fiks_arkiv.missing_gateway_alert')
          : t('process_editor.configuration_panel.fiks_arkiv.gateway_without_branches_alert', {
              count: issue.gatewayIds.length,
              gateways: issue.gatewayIds.join(', '),
            })}
      </StudioParagraph>
    </StudioAlert>
  );
};

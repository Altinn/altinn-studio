import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioParagraph } from '@studio/components';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnDiagramVersion } from '../../../../hooks/useBpmnDiagramVersion';
import { getFiksArkivProcessShapeIssue } from './fiksArkivProcessShape';

/** Warns when the process around a Fiks Arkiv task would stop the app from starting. */
export const FiksArkivProcessShapeAlert = (): ReactElement | null => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  useBpmnDiagramVersion();
  const issue = getFiksArkivProcessShapeIssue(bpmnDetails.element);

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

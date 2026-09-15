import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioParagraph } from '@studio/components';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import type { BpmnTaskType } from '../../../../types/BpmnTaskType';

/**
 * Studio can create these task types but cannot yet configure them, and the runtime needs values
 * Studio has no field for. Leaving that to a help text the developer has to open would be too
 * quiet: an eFormidling task the palette just created is enough to stop the app from starting.
 *
 * Temporary. Each entry disappears when the task type gets its own panel.
 */
const alertKeyByTaskType: Partial<Record<BpmnTaskType, string>> = {
  eFormidling: 'process_editor.configuration_panel_eformidling_incomplete_config_alert',
  subformPdf: 'process_editor.configuration_panel_subform_pdf_incomplete_config_alert',
};

export const IncompleteConfigAlert = (): React.ReactElement | null => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  const alertKey = alertKeyByTaskType[bpmnDetails.taskType];
  if (!alertKey) return null;

  return (
    <StudioAlert data-color='warning'>
      <StudioParagraph data-size='sm'>{t(alertKey)}</StudioParagraph>
    </StudioAlert>
  );
};

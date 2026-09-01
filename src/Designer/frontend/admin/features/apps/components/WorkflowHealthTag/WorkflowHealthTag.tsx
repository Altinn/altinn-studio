import type { ReactElement } from 'react';
import { StudioTag } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { WorkflowHealth } from 'admin/features/apps/utils/workflowHealth';

type HealthPresentation = {
  color: string;
  labelKey: string;
  descriptionKey: string;
};

/**
 * How each traffic-light state reads to an operator. `NoData` and `Unavailable` are separate states
 * with their own copy on purpose — neither may be mistaken for a healthy instance.
 */
export const WORKFLOW_HEALTH_PRESENTATION: Record<WorkflowHealth, HealthPresentation> = {
  [WorkflowHealth.Failed]: {
    color: 'danger',
    labelKey: 'admin.workflows.health.failed',
    descriptionKey: 'admin.workflows.health.failed_description',
  },
  [WorkflowHealth.SideEffectsFailed]: {
    color: 'warning',
    labelKey: 'admin.workflows.health.side_effects_failed',
    descriptionKey: 'admin.workflows.health.side_effects_failed_description',
  },
  [WorkflowHealth.Active]: {
    color: 'info',
    labelKey: 'admin.workflows.health.active',
    descriptionKey: 'admin.workflows.health.active_description',
  },
  [WorkflowHealth.Healthy]: {
    color: 'success',
    labelKey: 'admin.workflows.health.healthy',
    descriptionKey: 'admin.workflows.health.healthy_description',
  },
  [WorkflowHealth.NoData]: {
    color: 'neutral',
    labelKey: 'admin.workflows.health.no_data',
    descriptionKey: 'admin.workflows.health.no_data_description',
  },
  [WorkflowHealth.Unavailable]: {
    color: 'neutral',
    labelKey: 'admin.workflows.health.unavailable',
    descriptionKey: 'admin.workflows.health.unavailable_description',
  },
};

export type WorkflowHealthTagProps = {
  health: WorkflowHealth;
};

export const WorkflowHealthTag = ({ health }: WorkflowHealthTagProps): ReactElement => {
  const { t } = useTranslation();
  const { color, labelKey, descriptionKey } = WORKFLOW_HEALTH_PRESENTATION[health];

  return (
    <StudioTag data-size='sm' data-color={color} title={t(descriptionKey)}>
      {t(labelKey)}
    </StudioTag>
  );
};

import type { ReactElement } from 'react';
import { StudioHelpText, StudioParagraph, StudioSkeleton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { WorkflowHealth } from 'admin/features/apps/utils/workflowHealth';
import {
  WORKFLOW_HEALTH_PRESENTATION,
  WorkflowHealthTag,
} from 'admin/features/apps/components/WorkflowHealthTag/WorkflowHealthTag';

import classes from './WorkflowHealthColumn.module.css';

const LEGEND_ORDER: WorkflowHealth[] = [
  WorkflowHealth.Failed,
  WorkflowHealth.SideEffectsFailed,
  WorkflowHealth.Active,
  WorkflowHealth.Healthy,
  WorkflowHealth.NoData,
];

export const WorkflowHealthHeaderCell = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <span className={classes.header}>
      {t('admin.workflows.health')}
      <StudioHelpText aria-label={t('admin.workflows.health.legend')} placement='left'>
        <StudioParagraph data-size='sm'>{t('admin.workflows.health.legend')}</StudioParagraph>
        <dl className={classes.legend}>
          {LEGEND_ORDER.map((health) => (
            <div key={health} className={classes.legendRow}>
              <dt>
                <WorkflowHealthTag health={health} />
              </dt>
              <dd className={classes.legendDescription}>
                {t(WORKFLOW_HEALTH_PRESENTATION[health].descriptionKey)}
              </dd>
            </div>
          ))}
        </dl>
      </StudioHelpText>
    </span>
  );
};

export type WorkflowHealthCellProps = {
  /** Undefined until the annotate request for this instance's page has answered. */
  health: WorkflowHealth | undefined;
  isPending: boolean;
};

export const WorkflowHealthCell = ({
  health,
  isPending,
}: WorkflowHealthCellProps): ReactElement => {
  const { t } = useTranslation();

  if (health === undefined) {
    return isPending ? (
      <StudioSkeleton aria-label={t('general.loading')} className={classes.skeleton} />
    ) : (
      <WorkflowHealthTag health={WorkflowHealth.NoData} />
    );
  }

  return <WorkflowHealthTag health={health} />;
};

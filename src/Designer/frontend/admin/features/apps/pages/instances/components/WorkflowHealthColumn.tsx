import type { ReactElement } from 'react';
import { StudioHelpText, StudioParagraph, StudioSkeleton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { WorkflowHealth } from 'admin/features/apps/utils/workflowHealth';
import {
  WORKFLOW_HEALTH_PRESENTATION,
  WorkflowHealthTag,
} from 'admin/features/apps/components/WorkflowHealthTag/WorkflowHealthTag';

import classes from './WorkflowHealthColumn.module.css';

/**
 * Every state the column can render, worst first. The three states that are not verdicts about the
 * instance come last, and are in the legend because a tag's own description is only reachable with
 * a mouse.
 */
const LEGEND_ORDER: WorkflowHealth[] = [
  WorkflowHealth.Failed,
  WorkflowHealth.SideEffectsFailed,
  WorkflowHealth.Active,
  WorkflowHealth.Healthy,
  WorkflowHealth.NoData,
  WorkflowHealth.Unknown,
  WorkflowHealth.Unavailable,
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
  /** Undefined until the annotate request this instance's key was asked for in has answered. */
  health: WorkflowHealth | undefined;
  /** True while that request is in flight. Only this row's own request counts. */
  isPending: boolean;
};

export const WorkflowHealthCell = ({
  health,
  isPending,
}: WorkflowHealthCellProps): ReactElement => {
  const { t } = useTranslation();

  if (isPending) {
    return <StudioSkeleton aria-label={t('general.loading')} className={classes.skeleton} />;
  }

  // A key with neither a verdict nor a request in flight is not a fact about the instance, so it
  // reads as unknown rather than as "the engine holds nothing".
  return <WorkflowHealthTag health={health ?? WorkflowHealth.Unknown} />;
};

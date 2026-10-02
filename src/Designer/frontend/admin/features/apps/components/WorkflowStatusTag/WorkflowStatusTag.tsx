import type { ComponentType, ReactElement, SVGProps } from 'react';
import { StudioSpinner, StudioTag } from '@studio/components';
import {
  CheckmarkCircleFillIcon,
  ClockFillIcon,
  EnvelopeClosedFillIcon,
  MinusCircleFillIcon,
  XMarkOctagonFillIcon,
} from '@studio/icons';
import { useTranslation } from 'react-i18next';
import type { PersistentItemStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';

import classes from './WorkflowStatusTag.module.css';

type StatusPresentation = {
  color: string;
  labelKey: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { title?: string }>;
};

/**
 * Engine lifecycle statuses as an operator reads them. Keyed by the engine's own PascalCase wire
 * values; the text keys are camelCase because that is this file's contract with `nb.json`.
 */
const STATUS_PRESENTATION: Record<PersistentItemStatus, StatusPresentation> = {
  Enqueued: { color: 'info', labelKey: 'admin.workflows.status.enqueued', icon: ClockFillIcon },
  Processing: { color: 'info', labelKey: 'admin.workflows.status.processing', icon: ClockFillIcon },
  Requeued: { color: 'info', labelKey: 'admin.workflows.status.requeued', icon: ClockFillIcon },
  Waiting: { color: 'info', labelKey: 'admin.workflows.status.waiting', icon: ClockFillIcon },
  Held: { color: 'info', labelKey: 'admin.workflows.status.held', icon: EnvelopeClosedFillIcon },
  Completed: {
    color: 'success',
    labelKey: 'admin.workflows.status.completed',
    icon: CheckmarkCircleFillIcon,
  },
  Failed: {
    color: 'danger',
    labelKey: 'admin.workflows.status.failed',
    icon: XMarkOctagonFillIcon,
  },
  Canceled: {
    color: 'danger',
    labelKey: 'admin.workflows.status.canceled',
    icon: XMarkOctagonFillIcon,
  },
  DependencyFailed: {
    color: 'danger',
    labelKey: 'admin.workflows.status.dependency_failed',
    icon: XMarkOctagonFillIcon,
  },
  Abandoned: {
    color: 'neutral',
    labelKey: 'admin.workflows.status.abandoned',
    icon: MinusCircleFillIcon,
  },
};

export type WorkflowStatusTagProps = {
  status: PersistentItemStatus;
};

export const WorkflowStatusTag = ({ status }: WorkflowStatusTagProps): ReactElement => {
  const { t } = useTranslation();
  const presentation = STATUS_PRESENTATION[status];

  // A status this build does not know about is still shown, verbatim, rather than swallowed.
  if (!presentation) {
    return (
      <StudioTag data-size='sm' data-color='neutral'>
        {status}
      </StudioTag>
    );
  }

  return (
    <StudioTag data-size='sm' data-color={presentation.color}>
      {t(presentation.labelKey)}
    </StudioTag>
  );
};

/**
 * The status as a small icon, for the start of a row the eye runs down: a check, a red cross, a
 * clock while it waits its turn, an envelope while it waits for a message, and a spinner while the
 * engine is working on it. Named by the tag's text.
 */
export const WorkflowStatusIcon = ({ status }: WorkflowStatusTagProps): ReactElement => {
  const { t } = useTranslation();
  const presentation = STATUS_PRESENTATION[status];
  const label = presentation ? t(presentation.labelKey) : status;
  if (status === 'Processing') {
    return <StudioSpinner data-size='xs' aria-label={label} className={classes.statusIcon} />;
  }
  const Icon = presentation?.icon ?? MinusCircleFillIcon;
  return (
    <Icon
      title={label}
      className={classes.statusIcon}
      data-tone={presentation?.color ?? 'neutral'}
    />
  );
};

/**
 * The status where a list has many rows and most of them went fine: a completed workflow or step
 * is a quiet check mark, so the rows that did not complete are the ones with a colored tag.
 */
export const WorkflowStatusMark = ({ status }: WorkflowStatusTagProps): ReactElement =>
  status === 'Completed' ? (
    <WorkflowStatusIcon status={status} />
  ) : (
    <WorkflowStatusTag status={status} />
  );

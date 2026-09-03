import type { ReactElement } from 'react';
import { StudioTag } from '@studio/components';
import { useTranslation } from 'react-i18next';
import type { PersistentItemStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';

type StatusPresentation = {
  color: string;
  labelKey: string;
};

/**
 * Engine lifecycle statuses as an operator reads them. Keyed by the engine's own PascalCase wire
 * values; the text keys are camelCase because that is this file's contract with `nb.json`.
 */
const STATUS_PRESENTATION: Record<PersistentItemStatus, StatusPresentation> = {
  Enqueued: { color: 'info', labelKey: 'admin.workflows.status.enqueued' },
  Processing: { color: 'info', labelKey: 'admin.workflows.status.processing' },
  Requeued: { color: 'info', labelKey: 'admin.workflows.status.requeued' },
  Waiting: { color: 'info', labelKey: 'admin.workflows.status.waiting' },
  Held: { color: 'info', labelKey: 'admin.workflows.status.held' },
  Completed: { color: 'success', labelKey: 'admin.workflows.status.completed' },
  Failed: { color: 'danger', labelKey: 'admin.workflows.status.failed' },
  Canceled: { color: 'danger', labelKey: 'admin.workflows.status.canceled' },
  DependencyFailed: { color: 'danger', labelKey: 'admin.workflows.status.dependency_failed' },
  Abandoned: { color: 'neutral', labelKey: 'admin.workflows.status.abandoned' },
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

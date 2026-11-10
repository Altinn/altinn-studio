import { StudioButton, StudioTable } from '@studio/components';
import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import {
  PARKED_WORKFLOW_STATUSES,
  RESUMABLE_WORKFLOW_STATUSES,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { WorkflowStatusMark } from 'admin/features/apps/components/WorkflowStatusTag/WorkflowStatusTag';
import { formatTimeOfDay, formatTimestamp } from 'admin/features/apps/utils/formatTimestamp';
import type { WorkflowGroup } from 'admin/features/apps/utils/workflowTriage';
import {
  auxiliaryWorkflowName,
  failedAttemptCount,
  focusStepOf,
  groupFocusWorkflow,
  isFailedWorkflow,
  orderedSteps,
} from 'admin/features/apps/utils/workflowTriage';
import { groupStepsOfWorkflows } from 'admin/features/apps/utils/workflowPhases';
import { stepDisplayName } from 'admin/features/apps/utils/stepNames';
import { useTaskNameOf } from 'admin/features/apps/hooks/useTaskNames';
import { StepDetails } from './StepDetails';
import { WorkflowActions } from './WorkflowActions';

import classes from './WorkflowSteps.module.css';

/** Operation, status, retries, last changed: what a details row spans. */
const STEP_COLUMN_COUNT = 4;

export type WorkflowStepsProps = {
  context: WorkflowOpsContext;
  group: WorkflowGroup;
};

/**
 * The steps of all the transition's workflows in the order they ran, then the auxiliary workflows
 * it spawned. The actions sit on the step each workflow stopped at: they act on the whole workflow,
 * but that step is where an operator looks and where the work continues from.
 */
export const WorkflowSteps = ({ context, group }: WorkflowStepsProps) => {
  const { t } = useTranslation();
  const taskNameOf = useTaskNameOf();
  const { members, auxiliaryWorkflows } = group;
  const stepGroups = groupStepsOfWorkflows(members);
  const focusSteps = new Set(members.map(focusStepOf));

  if (!stepGroups.length && auxiliaryWorkflows.length === 0) {
    return <WorkflowActions context={context} workflow={groupFocusWorkflow(group)} />;
  }

  return (
    <div className={classes.steps}>
      <StudioTable data-size='sm'>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.Cell>{t('admin.workflows.operation')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.status')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.step.retries')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.instances.last_changed')}</StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {stepGroups.map((stepGroup) => {
            // A task's lifecycle steps go under that task's name. Steps of no known element keep
            // to the left edge.
            const heading = stepGroup.elementId;
            const indent = heading ? classes.groupedCell : undefined;
            return (
              <Fragment key={stepGroup.steps[0].step.databaseId}>
                {heading && <GroupHeading>{taskNameOf(heading)}</GroupHeading>}
                {stepGroup.steps.map(({ step, workflow }) => (
                  <WorkflowStepRow
                    key={step.databaseId}
                    context={context}
                    workflow={workflow}
                    step={step}
                    isFocusStep={focusSteps.has(step)}
                    indent={indent}
                  />
                ))}
              </Fragment>
            );
          })}
          {/* In the same table as the steps, so their columns line up. */}
          {auxiliaryWorkflows.length > 0 && (
            <>
              <GroupHeading>{t('admin.workflows.auxiliary_workflows')}</GroupHeading>
              {auxiliaryWorkflows.map((auxiliaryWorkflow) => (
                <AuxiliaryWorkflowRow
                  key={auxiliaryWorkflow.databaseId}
                  context={context}
                  workflow={auxiliaryWorkflow}
                />
              ))}
            </>
          )}
        </StudioTable.Body>
      </StudioTable>
    </div>
  );
};

type AuxiliaryWorkflowRowProps = {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
};

/** An auxiliary workflow's row, which opens onto its steps. A failed or retrying one starts open. */
const AuxiliaryWorkflowRow = ({ context, workflow }: AuxiliaryWorkflowRowProps) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(
    () => isFailedWorkflow(workflow) || workflow.overallStatus === 'Requeued',
  );
  const steps = orderedSteps(workflow);
  const focusStep = focusStepOf(workflow);
  const hasVerbs = hasWorkflowVerbs(workflow);
  const failures = failedAttemptCount(workflow);
  const canExpand = steps.length > 0 || hasVerbs;

  return (
    <Fragment>
      <StudioTable.Row
        className={classes.auxiliaryWorkflowRow}
        data-testid='auxiliary-workflow-row'
      >
        <StudioTable.Cell className={classes.groupedCell}>
          <div className={classes.auxiliaryWorkflowName}>
            {canExpand ? (
              <StudioButton
                variant='tertiary'
                data-color='neutral'
                data-size='sm'
                className={classes.auxiliaryWorkflowToggle}
                aria-expanded={expanded}
                onClick={() => setExpanded((open) => !open)}
                title={workflow.operationId}
                icon={expanded ? <ChevronDownIcon aria-hidden /> : <ChevronRightIcon aria-hidden />}
              >
                {auxiliaryWorkflowName(workflow)}
              </StudioButton>
            ) : (
              <span title={workflow.operationId}>{auxiliaryWorkflowName(workflow)}</span>
            )}
            {steps.length > 0 && (
              <span className={classes.auxiliaryWorkflowProgress}>
                {t('admin.workflows.row.steps', {
                  completed: steps.filter((step) => step.status === 'Completed').length,
                  total: steps.length,
                })}
              </span>
            )}
          </div>
        </StudioTable.Cell>
        <StudioTable.Cell>
          <WorkflowStatusMark status={workflow.overallStatus} />
        </StudioTable.Cell>
        <StudioTable.Cell className={classes.numberCell}>
          {failures > 0 && failures}
        </StudioTable.Cell>
        <StudioTable.Cell
          className={classes.timeCell}
          title={formatTimestamp(workflow.updatedAt ?? workflow.createdAt, 'milliseconds')}
        >
          {formatTimeOfDay(workflow.updatedAt ?? workflow.createdAt, 'milliseconds')}
        </StudioTable.Cell>
      </StudioTable.Row>
      {expanded &&
        steps.map((step) => (
          <WorkflowStepRow
            key={step.databaseId}
            context={context}
            workflow={workflow}
            step={step}
            isFocusStep={step === focusStep}
            indent={classes.auxiliaryWorkflowStep}
          />
        ))}
      {expanded && steps.length === 0 && hasVerbs && (
        <StudioTable.Row>
          <StudioTable.Cell colSpan={STEP_COLUMN_COUNT} className={classes.auxiliaryWorkflowStep}>
            <WorkflowActions context={context} workflow={workflow} />
          </StudioTable.Cell>
        </StudioTable.Row>
      )}
    </Fragment>
  );
};

type WorkflowStepRowProps = {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
  step: WorkflowStepStatus;
  isFocusStep: boolean;
  indent?: string;
};

/** The same step details and actions apply to primary and auxiliary workflows. */
const WorkflowStepRow = ({
  context,
  workflow,
  step,
  isFocusStep,
  indent,
}: WorkflowStepRowProps) => {
  const { t } = useTranslation();
  const taskNameOf = useTaskNameOf();
  const hasVerbs = isFocusStep && hasWorkflowVerbs(workflow);
  const hasDetails = hasStepDetails(step) || hasVerbs;
  const failures = step.errorHistory?.length ?? 0;

  return (
    <Fragment>
      <StudioTable.Row className={hasDetails ? classes.stepRowWithDetails : undefined}>
        <StudioTable.Cell className={indent} title={step.operationId}>
          {stepDisplayName(step, workflow, t, taskNameOf)}
        </StudioTable.Cell>
        <StudioTable.Cell>
          <WorkflowStatusMark status={step.status} />
        </StudioTable.Cell>
        <StudioTable.Cell className={classes.numberCell}>
          {failures > 0 && failures}
        </StudioTable.Cell>
        <StudioTable.Cell
          className={classes.timeCell}
          title={formatTimestamp(step.updatedAt, 'milliseconds')}
        >
          {formatTimeOfDay(step.updatedAt, 'milliseconds')}
        </StudioTable.Cell>
      </StudioTable.Row>
      {hasDetails && (
        <StudioTable.Row>
          <StudioTable.Cell
            colSpan={STEP_COLUMN_COUNT}
            className={[classes.stepDetailsCell, indent].filter(Boolean).join(' ')}
          >
            <StepDetails
              step={step}
              verbs={hasVerbs && <WorkflowActions context={context} workflow={workflow} />}
            />
          </StudioTable.Cell>
        </StudioTable.Row>
      )}
    </Fragment>
  );
};

/** A heading row in the steps table, for a task's steps or for the auxiliary workflows. */
const GroupHeading = ({ children }: { children: ReactNode }) => (
  <StudioTable.Row className={classes.groupHeadingRow}>
    <StudioTable.Cell colSpan={STEP_COLUMN_COUNT} className={classes.groupHeading}>
      {children}
    </StudioTable.Cell>
  </StudioTable.Row>
);

/** Whether the ops verbs apply to the workflow at all, so a details row is worth drawing for them. */
function hasWorkflowVerbs(workflow: WorkflowStatus): boolean {
  return (
    RESUMABLE_WORKFLOW_STATUSES.includes(workflow.overallStatus) ||
    PARKED_WORKFLOW_STATUSES.includes(workflow.overallStatus)
  );
}

/** Whether a step has anything to say beyond its status: a defer reason or an error. */
function hasStepDetails(step: WorkflowStepStatus): boolean {
  return Boolean(step.lastDeferReason) || (step.errorHistory?.length ?? 0) > 0;
}

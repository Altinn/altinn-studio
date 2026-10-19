import type {
  CollectionWorkflowCounts,
  WorkflowRoleCounts,
} from 'admin/features/apps/types/workflows/WorkflowCollection';

type WorkflowCountsOverrides = {
  total?: number;
  primary?: Partial<WorkflowRoleCounts>;
  auxiliary?: Partial<WorkflowRoleCounts>;
};

const settled: WorkflowRoleCounts = { active: 0, failed: 0, requeued: 0, waiting: 0, held: 0 };

/** A collection rollup with every count zero except the ones given. */
export const workflowCounts = ({
  total = 1,
  primary = {},
  auxiliary = {},
}: WorkflowCountsOverrides = {}): CollectionWorkflowCounts => ({
  total,
  primary: { ...settled, ...primary },
  auxiliary: { ...settled, ...auxiliary },
});

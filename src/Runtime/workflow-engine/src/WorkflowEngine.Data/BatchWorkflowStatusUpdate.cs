using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// A single workflow and its dirty steps for batched status persistence.
/// </summary>
internal sealed record BatchWorkflowStatusUpdate(Workflow Workflow, IReadOnlyList<Step> DirtySteps);

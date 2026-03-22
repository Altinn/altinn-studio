using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// A single workflow and its dirty steps for batched status persistence.
/// </summary>
public sealed record BatchWorkflowStatusUpdate(Workflow Workflow, IReadOnlyList<Step> DirtySteps);

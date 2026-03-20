using WorkflowEngine.Models;

namespace WorkflowEngine.Data;

/// <summary>
/// A single workflow and an optional step for batched status persistence.
/// <paramref name="Step"/> is the single step to update, or <c>null</c> for workflow-only updates
/// (e.g. DependencyFailed, unhandled exception).
/// </summary>
public sealed record BatchWorkflowStatusUpdate(Workflow Workflow, Step? Step);

using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core;

internal sealed record DashboardStepDto(
    string IdempotencyKey,
    string OperationId,
    string CommandType,
    string CommandDetail,
    string Status,
    int ProcessingOrder,
    int RetryCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExecutionStartedAt,
    DateTimeOffset? UpdatedAt,
    bool StateChanged
);

/// <summary>
/// A related workflow (dependency, dependent, or link) as shown on a dashboard card.
/// </summary>
internal sealed record DashboardRelationDto(Guid DatabaseId, string OperationId, string Status);

internal sealed record DashboardWorkflowDto(
    Guid DatabaseId,
    string IdempotencyKey,
    string OperationId,
    string Status,
    string? TraceId,
    string? CollectionKey,
    string Namespace,
    Dictionary<string, string>? Labels,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExecutionStartedAt,
    DateTimeOffset? UpdatedAt,
    DateTimeOffset? StartAt,
    DateTimeOffset? BackoffUntil,
    bool HasState,
    bool? IsHead,
    // Relation arrays are tri-state on the wire: omitted (null) = not loaded by the source query
    // (the frontend fetches on demand via /dashboard/relations), [] = loaded and none exist.
    IReadOnlyList<DashboardRelationDto>? DependsOn,
    IReadOnlyList<DashboardRelationDto>? Dependents,
    IReadOnlyList<DashboardRelationDto>? Links,
    IReadOnlyList<DashboardStepDto> Steps
);

internal static class DashboardMapper
{
    internal static DashboardStepDto MapStep(Step step, bool stateChanged) =>
        new(
            step.DatabaseId.ToString(),
            step.OperationId,
            step.Command.Type,
            step.OperationId,
            step.Status.ToString(),
            step.ProcessingOrder,
            step.RequeueCount,
            step.CreatedAt,
            step.ExecutionStartedAt,
            step.UpdatedAt,
            stateChanged
        );

    internal static DashboardWorkflowDto MapWorkflow(Workflow workflow)
    {
        List<Step> ordered = workflow.Steps.OrderBy(s => s.ProcessingOrder).ToList();
        var mapped = new List<DashboardStepDto>(ordered.Count);
        string? prevState = workflow.InitialState;

        foreach (Step step in ordered)
        {
            bool changed = step.StateOut is not null && step.StateOut != prevState;
            mapped.Add(MapStep(step, changed));
            if (step.StateOut is not null)
                prevState = step.StateOut;
        }

        return new DashboardWorkflowDto(
            workflow.DatabaseId,
            workflow.IdempotencyKey,
            workflow.OperationId,
            workflow.Status.ToString(),
            Metrics.ParseTraceContext(workflow.EngineTraceContext)?.TraceId.ToString()
                ?? workflow.EngineActivity?.TraceId.ToString(),
            workflow.CollectionKey,
            workflow.Namespace,
            workflow.Labels,
            workflow.CreatedAt,
            workflow.ExecutionStartedAt,
            workflow.UpdatedAt,
            workflow.StartAt,
            workflow.BackoffUntil,
            workflow.InitialState is not null || ordered.Any(s => s.StateOut is not null),
            workflow.IsHead,
            MapRelations(workflow.Dependencies),
            MapRelations(workflow.Dependents),
            MapRelations(workflow.Links),
            mapped
        );
    }

    internal static IReadOnlyList<DashboardRelationDto>? MapRelations(IEnumerable<Workflow>? related) =>
        related?.Select(r => new DashboardRelationDto(r.DatabaseId, r.OperationId, r.Status.ToString())).ToList();
}

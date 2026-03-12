using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Api;

internal sealed record DashboardStepDto(
    string IdempotencyKey,
    string OperationId,
    string CommandType,
    string CommandDetail,
    string? LastError,
    string Status,
    int ProcessingOrder,
    int RetryCount,
    DateTimeOffset? BackoffUntil,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExecutionStartedAt,
    DateTimeOffset? UpdatedAt,
    bool StateChanged
);

internal sealed record DashboardWorkflowDto(
    string IdempotencyKey,
    string OperationId,
    string Status,
    string? TraceId,
    string Namespace,
    Dictionary<string, string>? Labels,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExecutionStartedAt,
    DateTimeOffset? UpdatedAt,
    DateTimeOffset? StartAt,
    DateTimeOffset? RemovedAt,
    bool HasState,
    IReadOnlyList<DashboardStepDto> Steps
);

internal static class DashboardMapper
{
    internal static DashboardStepDto MapStep(Step step, bool stateChanged) =>
        new(
            step.IdempotencyKey,
            step.OperationId,
            step.Command.Type,
            step.OperationId,
            step.LastError,
            step.Status.ToString(),
            step.ProcessingOrder,
            step.RequeueCount,
            step.BackoffUntil,
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
            workflow.IdempotencyKey,
            workflow.OperationId,
            workflow.Status.ToString(),
            Metrics.ParseTraceContext(workflow.EngineTraceContext)?.TraceId.ToString()
                ?? workflow.EngineActivity?.TraceId.ToString(),
            workflow.Namespace,
            workflow.Labels,
            workflow.CreatedAt,
            workflow.ExecutionStartedAt,
            workflow.UpdatedAt,
            workflow.StartAt,
            null,
            workflow.InitialState is not null || ordered.Any(s => s.StateOut is not null),
            mapped
        );
    }
}

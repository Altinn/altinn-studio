using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Api;

internal sealed record DashboardInstanceDto(string Org, string App, int InstanceOwnerPartyId, Guid InstanceGuid);

internal sealed record DashboardStepDto(
    string IdempotencyKey,
    string OperationId,
    string CommandType,
    string CommandDetail,
    string? CommandPayload,
    string? LastError,
    string Status,
    int ProcessingOrder,
    int RetryCount,
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
    Guid CorrelationId,
    DashboardInstanceDto Instance,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExecutionStartedAt,
    DateTimeOffset? UpdatedAt,
    DateTimeOffset? StartAt,
    DateTimeOffset? BackoffUntil,
    DateTimeOffset? RemovedAt,
    bool HasState,
    IReadOnlyList<DashboardStepDto> Steps
);

internal static class DashboardMapper
{
    internal static string CommandTypeDiscriminator(Command cmd) =>
        cmd is Command.AppCommand ? "app"
        : cmd is Command.Webhook ? "webhook"
        : cmd.GetType().Name;

    internal static DashboardInstanceDto MapInstance(InstanceInformation info) =>
        new(info.Org, info.App, info.InstanceOwnerPartyId, info.InstanceGuid);

    internal static DashboardStepDto MapStep(Step step, bool stateChanged) =>
        new(
            step.IdempotencyKey,
            step.OperationId,
            CommandTypeDiscriminator(step.Command),
            step.Command.OperationId,
            (step.Command as Command.AppCommand)?.Payload,
            step.LastError,
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
            workflow.IdempotencyKey,
            workflow.OperationId,
            workflow.Status.ToString(),
            Metrics.ParseTraceContext(workflow.EngineTraceContext)?.TraceId.ToString()
                ?? workflow.EngineActivity?.TraceId.ToString(),
            workflow.CorrelationId,
            MapInstance(workflow.InstanceInformation),
            workflow.CreatedAt,
            workflow.ExecutionStartedAt,
            workflow.UpdatedAt,
            workflow.StartAt,
            workflow.BackoffUntil,
            null,
            workflow.InitialState is not null || ordered.Any(s => s.StateOut is not null),
            mapped
        );
    }
}

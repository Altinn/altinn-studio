using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal sealed record DashboardInstanceDto(string Org, string App, int InstanceOwnerPartyId, Guid InstanceGuid);

internal sealed record DashboardStepDto(
    string IdempotencyKey,
    string OperationId,
    string CommandType,
    string CommandDetail,
    string? CommandPayload,
    IReadOnlyList<string>? ErrorHistory,
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
    DashboardInstanceDto Instance,
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
            step.ErrorHistory.Count > 0 ? step.ErrorHistory : null,
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

        for (int i = 0; i < ordered.Count; i++)
        {
            Step step = ordered[i];

            // ExecutionStartedAt is in-memory only (not persisted). When loading from DB,
            // approximate it: subsequent steps started when the previous step finished;
            // first step uses its own CreatedAt (safe across retries).
            if (step.ExecutionStartedAt is null && step.UpdatedAt is not null)
            {
                step.ExecutionStartedAt = i > 0 ? ordered[i - 1].UpdatedAt : step.CreatedAt;
            }

            bool changed = step.StateOut is not null && step.StateOut != prevState;
            mapped.Add(MapStep(step, changed));
            if (step.StateOut is not null)
                prevState = step.StateOut;
        }

        return new(
            workflow.IdempotencyKey,
            workflow.OperationId,
            workflow.Status.ToString(),
            workflow.EngineTraceId ?? workflow.EngineActivity?.TraceId.ToString(),
            MapInstance(workflow.InstanceInformation),
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

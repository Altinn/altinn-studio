using WorkflowEngine.Models;

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
    DateTimeOffset? BackoffUntil,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExecutionStartedAt,
    DateTimeOffset? UpdatedAt
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

    internal static DashboardStepDto MapStep(Step step) =>
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
            step.BackoffUntil,
            step.CreatedAt,
            step.ExecutionStartedAt,
            step.UpdatedAt
        );

    internal static DashboardWorkflowDto MapWorkflow(Workflow workflow) =>
        new(
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
            workflow.Steps.OrderBy(s => s.ProcessingOrder).Select(MapStep).ToList()
        );
}

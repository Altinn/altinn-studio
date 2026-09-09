namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>A recipient in the frozen plan for one entry into a signing task.</summary>
internal sealed record SigneeCommandPayload(string TaskId, Guid SigneeStateElementId, Guid SigneeId)
    : CommandRequestPayload
{
    internal override string? Validate() =>
        string.IsNullOrWhiteSpace(TaskId) || SigneeStateElementId == Guid.Empty || SigneeId == Guid.Empty
            ? "The signing task, state element and recipient identities are required."
            : null;
}

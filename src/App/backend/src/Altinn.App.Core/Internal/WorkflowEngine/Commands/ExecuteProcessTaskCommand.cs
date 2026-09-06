using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for <see cref="ExecuteProcessTaskCommand"/>: the key of the <see cref="IProcessTaskCommand"/>
/// this step runs, and the payload the declaring task attached to it.
/// </summary>
/// <remarks>
/// <see cref="CommandKey"/> is semantically required but nullable: deserialization runs outside any handler, so
/// a missing key must be refused as a legible permanent failure rather than thrown out as an unhandled callback
/// exception.
/// </remarks>
internal sealed record ExecuteProcessTaskCommandPayload(string? CommandKey, string? Payload = null)
    : CommandRequestPayload;

/// <summary>
/// The one engine command every process task command runs through. A task's declared commands are expanded
/// into one of these steps each when the transition is enqueued; at execute time the step resolves the command
/// by key and runs it through <see cref="ProcessTaskCommandExecutor"/>. The engine's own context and result
/// types stay internal; the command sees only the narrow <see cref="ProcessTaskCommandContext"/>.
/// </summary>
internal sealed class ExecuteProcessTaskCommand : WorkflowEngineCommandBase<ExecuteProcessTaskCommandPayload>
{
    public static string Key => "ExecuteProcessTaskCommand";

    private readonly ProcessTaskCommandExecutor _executor;

    public ExecuteProcessTaskCommand(ProcessTaskCommandExecutor executor)
    {
        _executor = executor;
    }

    public override string GetKey() => Key;

    public override Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ExecuteProcessTaskCommandPayload payload
    )
    {
        if (string.IsNullOrWhiteSpace(payload.CommandKey))
        {
            return Task.FromResult<ProcessEngineCommandResult>(
                FailedProcessEngineCommandResult.Permanent(
                    "A process task command step names no command. The workflow was enqueued by a version of "
                        + "the app that identified steps differently; resume it on that version, or abandon it.",
                    "InvalidPayloadException"
                )
            );
        }

        return _executor.Execute(new ProcessTaskCommandRef(payload.CommandKey, payload.Payload), context);
    }
}

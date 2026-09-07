using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Runs one <see cref="IProcessTaskCommand"/> declared by a process task: resolves it by key, hands it the
/// narrow app-facing context built from the engine callback, and maps its result to the engine's vocabulary.
/// Each invocation runs one engine step through <see cref="ExecuteProcessTaskCommand"/>.
/// </summary>
internal sealed class ProcessTaskCommandExecutor
{
    /// <summary>
    /// Reason code for every failure a task command reports, whichever phase it runs in.
    /// </summary>
    internal const string FailedReasonCode = "ProcessTaskCommandFailed";

    private readonly AppImplementationFactory _appImplementationFactory;

    public ProcessTaskCommandExecutor(AppImplementationFactory appImplementationFactory)
    {
        _appImplementationFactory = appImplementationFactory;
    }

    /// <summary>
    /// Runs the command <paramref name="command"/> names against the callback in <paramref name="context"/>.
    /// A missing or ambiguous key is a permanent failure: no retry changes what is registered.
    /// </summary>
    public async Task<ProcessEngineCommandResult> Execute(
        ProcessTaskCommandRef command,
        ProcessEngineCommandContext context
    )
    {
        List<IProcessTaskCommand> matches = _appImplementationFactory
            .GetAll<IProcessTaskCommand>()
            .Where(candidate => string.Equals(candidate.Key, command.Key, StringComparison.Ordinal))
            .ToList();

        if (matches.Count == 0)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"No process task command with key '{command.Key}' is registered. The task that declared it "
                    + "changed since this workflow was enqueued, or the workflow was enqueued by another version "
                    + "of the app. Resume it on the version that enqueued it, or abandon it deliberately.",
                "ProcessTaskCommandNotFound"
            );
        }

        if (matches.Count > 1)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"{matches.Count} process task commands are registered with key '{command.Key}': "
                    + string.Join(", ", matches.Select(match => match.GetType().FullName))
                    + ". Keys must be unique among the app's task commands.",
                "ProcessTaskCommandAmbiguous"
            );
        }

        Instance instance = context.InstanceDataMutator.Instance;
        ProcessTaskCommandResult result;
        try
        {
            result = await matches[0]
                .Execute(
                    new ProcessTaskCommandContext
                    {
                        InstanceDataMutator = context.InstanceDataMutator,
                        TaskId = instance.Process.CurrentTask.ElementId,
                        Payload = command.Payload,
                        WorkflowId = context.Payload.WorkflowId,
                        StepId = context.Payload.StepId,
                        CancellationToken = context.CancellationToken,
                    }
                );
        }
        catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Same contract as the lifecycle hooks had: an exception is a retryable failure.
            return FailedProcessEngineCommandResult.Retryable(ex);
        }

        return result switch
        {
            CompletedProcessTaskCommandResult => new SuccessfulProcessEngineCommandResult(),
            FailedProcessTaskCommandResult { Permanent: true } failed => FailedProcessEngineCommandResult.Permanent(
                FailedMessage(command.Key, failed.ErrorMessage),
                FailedReasonCode
            ),
            FailedProcessTaskCommandResult failed => FailedProcessEngineCommandResult.Retryable(
                FailedMessage(command.Key, failed.ErrorMessage),
                FailedReasonCode
            ),
            // The result root has no public constructor, but records can be derived through the copy
            // constructor; permanent so an author mistake converges instead of retrying forever.
            _ => FailedProcessEngineCommandResult.Permanent(
                $"Process task command '{command.Key}' returned a result of type '{result.GetType().Name}', "
                    + $"which this version of the app-lib cannot act on. Return one of the results the "
                    + $"{nameof(ProcessTaskCommandResult)} factory methods produce.",
                "ProcessTaskCommandResultUnknown"
            ),
        };
    }

    private static string FailedMessage(string commandKey, string errorMessage) =>
        $"Process task command '{commandKey}' failed: {errorMessage}";
}

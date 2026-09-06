using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Sends the call to action to every delegated signee not yet messaged and records the outcome per signee. The
/// last of the signing task's three start commands. Each send carries an idempotency key derived from the
/// workflow, the step and the signee, so a retried attempt cannot notify anyone twice. A transient failure fails
/// the step for retry; a permanent failure, for one signee or for all of them, is recorded and the step still
/// completes.
/// </summary>
internal sealed class NotifySigneesCommand : IProcessTaskCommand
{
    public static string Key => "NotifySignees";

    private readonly IServiceProvider _services;
    private readonly IProcessReader _processReader;

    public NotifySigneesCommand(IServiceProvider services, IProcessReader processReader)
    {
        _services = services;
        _processReader = processReader;
    }

    /// <inheritdoc/>
    string IProcessTaskCommand.Key => Key;

    /// <inheritdoc/>
    public ProcessStepOptions StepOptions => SigningStepOptions.PlatformCallsPerSignee;

    /// <inheritdoc/>
    public async Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context)
    {
        AltinnSignatureConfiguration configuration = SigningTaskConfiguration.Get(_processReader, context.TaskId);
        if (!SigningTaskConfiguration.IsRuntimeDelegated(configuration))
        {
            return ProcessTaskCommandResult.Completed();
        }

        ISigneeInitializationService initialization = _services.GetRequiredService<ISigneeInitializationService>();
        try
        {
            await initialization.ExecuteNotification(
                context.InstanceDataMutator,
                configuration,
                context.TaskId,
                context.WorkflowId,
                context.StepId,
                context.CancellationToken
            );
            return ProcessTaskCommandResult.Completed();
        }
        catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (SigneeInitializationPermanentException e)
        {
            return ProcessTaskCommandResult.FailedPermanent(e.Message);
        }
        catch (Exception e)
        {
            return ProcessTaskCommandResult.FailedRetryable(SigningFailureClassifier.ShortReason(e));
        }
    }
}

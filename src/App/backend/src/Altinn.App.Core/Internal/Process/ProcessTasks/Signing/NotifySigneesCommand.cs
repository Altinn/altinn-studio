using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Sends the call to action to every delegated signee not yet messaged and records the outcome per signee. The
/// last of the signing task's three start commands. Each send carries an idempotency key derived from the
/// workflow, the step and the signee, so a retried attempt cannot notify anyone twice. A transient failure fails
/// the step for retry; a permanent failure, for one signee or for all of them, is recorded and the step still
/// completes.
/// </summary>
internal sealed class NotifySigneesCommand : WorkflowEngineCommandBase<ProcessTaskPayload>
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
    public override string GetKey() => Key;

    /// <inheritdoc/>
    public override ProcessStepOptions DefaultStepOptions => SigningStepOptions.PlatformCallsPerSignee;

    /// <inheritdoc/>
    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ProcessTaskPayload payload
    )
    {
        try
        {
            // Read the configuration inside the try: a redeploy can remove it while this workflow is in flight,
            // and that is a permanent configuration failure, not a retryable one. The initialization service is
            // resolved only after the task is known to be runtime-delegated, so unrelated tasks never build the
            // signing client graph.
            AltinnSignatureConfiguration configuration = SigningTaskConfiguration.Get(_processReader, payload.TaskId);
            if (!SigningTaskConfiguration.IsRuntimeDelegated(configuration))
            {
                return ProcessEngineCommandResult.Completed();
            }

            ISigneeInitializationService initialization = _services.GetRequiredService<ISigneeInitializationService>();
            await initialization.ExecuteNotification(
                context.InstanceDataMutator,
                configuration,
                payload.TaskId,
                context.WorkflowId,
                context.StepId,
                context.CancellationToken
            );
            return ProcessEngineCommandResult.Completed();
        }
        catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (ApplicationConfigException e)
        {
            return ProcessEngineCommandResult.FailedPermanent(
                $"Process task command '{Key}' failed: {e.Message}",
                "SigneeConfigurationChanged"
            );
        }
        catch (SigneeInitializationPermanentException e)
        {
            return ProcessEngineCommandResult.FailedPermanent(
                $"Process task command '{Key}' failed: {e.Message}",
                e.ErrorCode
            );
        }
        catch (Exception e)
        {
            return ProcessEngineCommandResult.FailedRetryable(
                $"Process task command '{Key}' failed: {SigningFailureClassifier.ShortReason(e)}",
                "ProcessTaskCommandFailed"
            );
        }
    }
}

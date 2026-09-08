using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Delegates the task's rights to every resolved signee not yet delegated and records the outcome per signee.
/// The second of the signing task's three start commands. A transient failure fails the step for retry; a
/// permanent failure for one signee is recorded on that signee and the step still completes.
/// </summary>
internal sealed class DelegateSigneeRightsCommand : WorkflowEngineCommandBase<ProcessTaskPayload>
{
    public static string Key => "DelegateSigneeRights";

    private readonly IServiceProvider _services;
    private readonly IProcessReader _processReader;

    public DelegateSigneeRightsCommand(IServiceProvider services, IProcessReader processReader)
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
        AltinnSignatureConfiguration configuration = SigningTaskConfiguration.Get(_processReader, payload.TaskId);
        if (!SigningTaskConfiguration.IsRuntimeDelegated(configuration))
        {
            return ProcessEngineCommandResult.Completed();
        }

        ISigneeInitializationService initialization = _services.GetRequiredService<ISigneeInitializationService>();
        try
        {
            await initialization.ExecuteDelegation(
                context.InstanceDataMutator,
                configuration,
                payload.TaskId,
                context.WorkflowId,
                context.CancellationToken
            );
            return ProcessEngineCommandResult.Completed();
        }
        catch (OperationCanceledException) when (context.CancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (SigneeInitializationPermanentException e)
        {
            return ProcessEngineCommandResult.FailedPermanent(
                $"Process task command '{Key}' failed: {e.Message}",
                "ProcessTaskCommandFailed"
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

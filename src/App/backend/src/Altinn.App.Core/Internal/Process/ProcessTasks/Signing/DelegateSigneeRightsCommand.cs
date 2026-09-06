using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Delegates the task's rights to every resolved signee not yet delegated and records the outcome per signee.
/// The second of the signing task's three start commands. A transient failure fails the step for retry; a
/// permanent failure for one signee is recorded on that signee and the step still completes.
/// </summary>
internal sealed class DelegateSigneeRightsCommand : IProcessTaskCommand
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
            await initialization.ExecuteDelegation(
                context.InstanceDataMutator,
                configuration,
                context.TaskId,
                context.WorkflowId,
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

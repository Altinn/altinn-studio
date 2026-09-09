using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Sends one frozen signee's call to action as an independent workflow. The callback holds a fresh instance
/// lock through execution and saving; the service refreshes stored state and rejects obsolete task entries.
/// </summary>
internal sealed class NotifySigneeCommand : WorkflowEngineCommandBase<SigneeCommandPayload>
{
    public static string Key => "NotifySignee";

    private readonly IServiceProvider _services;
    private readonly IProcessReader _processReader;

    public NotifySigneeCommand(IServiceProvider services, IProcessReader processReader)
    {
        _services = services;
        _processReader = processReader;
    }

    /// <inheritdoc/>
    public override string GetKey() => Key;

    /// <inheritdoc/>
    public override ProcessStepOptions DefaultStepOptions =>
        SigningStepOptions.PlatformCallsPerSignee with
        {
            WaitBudget = TimeSpan.FromMinutes(10),
        };

    /// <inheritdoc/>
    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        SigneeCommandPayload payload
    )
    {
        try
        {
            AltinnSignatureConfiguration configuration = SigningTaskConfiguration.Get(_processReader, payload.TaskId);
            if (!SigningTaskConfiguration.IsRuntimeDelegated(configuration))
            {
                return ProcessEngineCommandResult.FailedPermanent(
                    "Runtime-delegated signing is no longer configured for the frozen recipient's task.",
                    "SigneeConfigurationChanged"
                );
            }

            ISigneeInitializationService initialization = _services.GetRequiredService<ISigneeInitializationService>();
            await initialization.ExecuteNotification(
                context.InstanceDataMutator,
                configuration,
                payload.TaskId,
                payload.SigneeStateElementId,
                payload.SigneeId,
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

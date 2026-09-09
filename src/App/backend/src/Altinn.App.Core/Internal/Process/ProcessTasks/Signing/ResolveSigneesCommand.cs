using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Resolves the signees of a runtime-delegated signing task through the app's signee provider and persists their
/// initial state. The signing scheduler reads the frozen recipient plan from that state. A retried attempt
/// adopts an element an earlier attempt created instead of asking the provider again.
/// </summary>
internal sealed class ResolveSigneesCommand : WorkflowEngineCommandBase<ProcessTaskPayload>
{
    public static string Key => "ResolveSignees";

    private readonly IServiceProvider _services;
    private readonly IProcessReader _processReader;

    /// <remarks>
    /// The initialization service is resolved when the command runs, not when it is constructed: every registered
    /// command is constructed on every callback, and the signing client graph must not be built for unrelated ones.
    /// </remarks>
    public ResolveSigneesCommand(IServiceProvider services, IProcessReader processReader)
    {
        _services = services;
        _processReader = processReader;
    }

    /// <inheritdoc/>
    public override string GetKey() => Key;

    /// <inheritdoc/>
    public override ProcessStepOptions DefaultStepOptions => SigningStepOptions.ProviderAndRegisterCalls;

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
            SigneeInitializationOutcome outcome = await initialization.ResolveSignees(
                context.InstanceDataMutator,
                configuration,
                payload.TaskId,
                context.CancellationToken
            );

            return outcome switch
            {
                SigneeInitializationOutcome.ContractViolation violation => ProcessEngineCommandResult.FailedPermanent(
                    $"Process task command '{Key}' failed: {violation.Message}",
                    "ProcessTaskCommandFailed"
                ),
                _ => ProcessEngineCommandResult.Completed(),
            };
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

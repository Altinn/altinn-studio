using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Resolves the signees of a runtime-delegated signing task through the app's signee provider and persists their
/// initial state. The first of the signing task's three start commands; the persisted state is what the two
/// later ones resume from. A retried attempt adopts an element an earlier attempt created instead of asking the
/// provider again.
/// </summary>
internal sealed class ResolveSigneesCommand : IProcessTaskCommand
{
    public static string Key => "ResolveSignees";

    private readonly IServiceProvider _services;
    private readonly IProcessReader _processReader;

    /// <remarks>
    /// The initialisation service is resolved when the command runs, not when it is constructed: every registered
    /// command is constructed on every callback, and the signing client graph must not be built for unrelated ones.
    /// </remarks>
    public ResolveSigneesCommand(IServiceProvider services, IProcessReader processReader)
    {
        _services = services;
        _processReader = processReader;
    }

    /// <inheritdoc/>
    string IProcessTaskCommand.Key => Key;

    /// <inheritdoc/>
    public ProcessStepOptions StepOptions => SigningStepOptions.ProviderAndRegisterCalls;

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
            SigneeInitializationOutcome outcome = await initialization.ResolveSignees(
                context.InstanceDataMutator,
                configuration,
                context.TaskId,
                context.CancellationToken
            );

            return outcome switch
            {
                SigneeInitializationOutcome.ContractViolation violation => ProcessTaskCommandResult.FailedPermanent(
                    violation.Message
                ),
                _ => ProcessTaskCommandResult.Completed(),
            };
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

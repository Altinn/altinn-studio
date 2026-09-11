using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Aborts runtime-delegated signing when the task is abandoned: revokes the signees' access and removes the
/// signee state and every signature. Declared by the signing task for its abandon phase.
/// </summary>
internal sealed class AbortRuntimeDelegatedSigningCommand : WorkflowEngineCommandBase<ProcessTaskPayload>
{
    public static string Key => "AbortRuntimeDelegatedSigning";

    private readonly IProcessReader _processReader;
    private readonly ISigningService _signingService;

    public AbortRuntimeDelegatedSigningCommand(IProcessReader processReader, ISigningService signingService)
    {
        _processReader = processReader;
        _signingService = signingService;
    }

    /// <inheritdoc/>
    public override string GetKey() => Key;

    /// <inheritdoc/>
    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ProcessTaskPayload payload
    )
    {
        AltinnSignatureConfiguration configuration = SigningTaskConfiguration.Get(_processReader, payload.TaskId);

        await _signingService.AbortRuntimeDelegatedSigning(
            context.InstanceDataMutator,
            configuration,
            context.CancellationToken
        );

        return ProcessEngineCommandResult.Completed();
    }
}

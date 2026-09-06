using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Aborts runtime-delegated signing when the task is abandoned: revokes the signees' access and removes the
/// signee state and every signature. Declared by the signing task for its abandon phase.
/// </summary>
internal sealed class AbortRuntimeDelegatedSigningCommand : IProcessTaskCommand
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
    string IProcessTaskCommand.Key => Key;

    /// <inheritdoc/>
    public async Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context)
    {
        AltinnSignatureConfiguration configuration = SigningTaskConfiguration.Get(_processReader, context.TaskId);

        await _signingService.AbortRuntimeDelegatedSigning(
            context.InstanceDataMutator,
            configuration,
            context.CancellationToken
        );

        return ProcessTaskCommandResult.Completed();
    }
}

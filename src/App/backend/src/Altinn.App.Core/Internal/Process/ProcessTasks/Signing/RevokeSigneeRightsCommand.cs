using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Internal.Process.ProcessTasks.Signing;

/// <summary>
/// Revokes the access rights delegated to the signees of a runtime-delegated signing task, so they do not
/// outlive the task. Declared by the signing task for its end phase.
/// </summary>
internal sealed class RevokeSigneeRightsCommand : IProcessTaskCommand
{
    public static string Key => "RevokeSigneeRights";

    private readonly IProcessReader _processReader;
    private readonly ISigningService _signingService;

    public RevokeSigneeRightsCommand(IProcessReader processReader, ISigningService signingService)
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

        if (!SigningTaskConfiguration.IsRuntimeDelegated(configuration))
        {
            return ProcessTaskCommandResult.Completed();
        }

        await _signingService.RevokeSigneeRightsOnTaskEnd(
            context.InstanceDataMutator,
            configuration,
            context.CancellationToken
        );

        return ProcessTaskCommandResult.Completed();
    }
}

using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.Platform.Storage.Interface.Models;

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
    private readonly IInstanceClient _instanceClient;

    public AbortRuntimeDelegatedSigningCommand(
        IProcessReader processReader,
        ISigningService signingService,
        IInstanceClient instanceClient
    )
    {
        _processReader = processReader;
        _signingService = signingService;
        _instanceClient = instanceClient;
    }

    /// <inheritdoc/>
    string IProcessTaskCommand.Key => Key;

    /// <inheritdoc/>
    public async Task<ProcessTaskCommandResult> Execute(ProcessTaskCommandContext context)
    {
        AltinnSignatureConfiguration configuration = SigningTaskConfiguration.Get(_processReader, context.TaskId);

        // A previous attempt may have deleted only some elements, or completed before its response was lost.
        // Reconcile the signing metadata before reading/revoking/deleting so a retry never targets missing data.
        Instance stored = await _instanceClient.GetInstance(
            context.InstanceDataMutator.Instance,
            StorageAuthenticationMethod.ServiceOwner(),
            context.CancellationToken
        );
        bool IsSigningData(DataElement element) =>
            element.DataType == configuration.SignatureDataType
            || element.DataType == configuration.SigneeStatesDataTypeId;
        List<DataElement> instanceData = context.InstanceDataMutator.Instance.Data ??= [];
        instanceData.RemoveAll(element => IsSigningData(element));
        instanceData.AddRange((stored.Data ?? []).Where(IsSigningData));

        await _signingService.AbortRuntimeDelegatedSigning(
            context.InstanceDataMutator,
            configuration,
            context.CancellationToken
        );

        return ProcessTaskCommandResult.Completed();
    }
}

using System.Globalization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

internal sealed class DeleteInstanceIfConfigured : IWorkflowEngineCommand
{
    public static string Key => "DeleteInstanceIfConfigured";

    public string GetKey() => Key;

    private readonly IInstanceClient _instanceClient;
    private readonly IAppMetadata _appMetadata;

    public DeleteInstanceIfConfigured(IInstanceClient instanceClient, IAppMetadata appMetadata)
    {
        _instanceClient = instanceClient;
        _appMetadata = appMetadata;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;

        if (instance.Process?.Ended is null)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        if (applicationMetadata.AutoDeleteOnProcessEnd is not true)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        InstanceIdentifier instanceIdentifier = new(instance);

        try
        {
            int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);
            await _instanceClient.DeleteInstance(
                instanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                true,
                StorageAuthenticationMethod.ServiceOwner(),
                CancellationToken.None
            );

            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}

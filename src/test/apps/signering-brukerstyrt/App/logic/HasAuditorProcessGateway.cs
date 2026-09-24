using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Models.Skjemadata;
using Altinn.Platform.Storage.Interface.Models;

public class HasAuditorProcessGateway : IProcessExclusiveGateway
{
    private readonly IDataClient _dataClient;

    public HasAuditorProcessGateway(IDataClient dataClient)
    {
        _dataClient = dataClient;
    }

    public string GatewayId => "Gateway_HasAuditor";

    public async Task<List<SequenceFlow>> FilterAsync(
        List<SequenceFlow> outgoingFlows,
        Instance instance,
        ProcessGatewayInformation processGatewayInformation
    )
    {
        Skjemadata formData = await GetFormData(instance);

        // The auditor block is absent until the user answers the "har revisor" question, and
        // anything other than an explicit "ja" routes past the auditor signing task.
        if (formData.Revisor?.HarRevisor == "ja")
        {
            return outgoingFlows.FindAll(flow => flow.TargetRef == "SigningTask_Auditor");
        }

        return outgoingFlows.FindAll(flow => flow.TargetRef == "EndEvent_1");
    }

    private async Task<Skjemadata> GetFormData(Instance instance)
    {
        // "Skjemadata" is declared with minCount 1 in applicationmetadata.json, so a missing
        // element means the app is misconfigured rather than that the user has not filled it in.
        DataElement modelData =
            instance.Data.Find(x => x.DataType == "Skjemadata")
            ?? throw new InvalidOperationException(
                "Expected a 'Skjemadata' data element on the instance"
            );
        InstanceIdentifier instanceIdentifier = new(instance);

        return (Skjemadata)
            await _dataClient.GetFormData(
                instanceIdentifier.InstanceGuid,
                typeof(Skjemadata),
                instance.Org,
                instance.AppId,
                instanceIdentifier.InstanceOwnerPartyId,
                new Guid(modelData.Id)
            );
    }
}

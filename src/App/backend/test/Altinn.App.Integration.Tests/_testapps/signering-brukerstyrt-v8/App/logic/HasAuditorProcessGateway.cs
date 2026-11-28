using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
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

        if (formData.Revisor.HarRevisor == "ja")
        {
            return outgoingFlows.FindAll(flow => flow.TargetRef == "SigningTask_Auditor");
        }

        return outgoingFlows.FindAll(flow => flow.TargetRef == "EndEvent_1");
    }

    private async Task<Skjemadata> GetFormData(Instance instance)
    {
        DataElement modelData = instance.Data.Find(x => x.DataType == "Skjemadata");
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

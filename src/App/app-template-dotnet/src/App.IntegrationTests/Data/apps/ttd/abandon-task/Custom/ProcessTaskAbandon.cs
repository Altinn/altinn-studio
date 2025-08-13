using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Interface;
using Altinn.Platform.Storage.Interface.Models;

namespace App.IntegrationTests.Mocks.Apps.Ttd.Abandon;

public class ProcessTaskAbandon : IProcessTaskAbandon
{
    private readonly IData _dataClient;


    public ProcessTaskAbandon(IData dataClient)
    {
        _dataClient = dataClient;
    }
    
    public async Task Abandon(string taskId, Instance instance)
    {
        if (taskId.Equals("Task_2"))
        {
            string org = instance.Org;
            string app = instance.AppId.Split("/")[1];
            int partyId = int.Parse(instance.InstanceOwner.PartyId);
            Guid instanceId = Guid.Parse(instance.Id.Split("/")[1]);
            var attachmentList = await _dataClient.GetBinaryDataList(org, app, partyId, instanceId);

            attachmentList.FindAll(a => a.Type.Equals("ref-data-as-pdf")).ForEach(async al =>
            {
                foreach (var a in al.Attachments)
                {
                    Guid dataGuid = Guid.Parse(a.Id);
                    await _dataClient.DeleteData(org, app, partyId, instanceId, dataGuid, false);
                }
            });
        }
    }
}
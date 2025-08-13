using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Interface;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTestsRef.Data.apps.tdd.sirius.services;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.sirius
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class ProcessTaskEnd: IProcessTaskEnd
    {
        private readonly IData _dataService;
        private readonly ISiriusApi _siriusApi;
        
        public ProcessTaskEnd(IData dataService, ISiriusApi siriusApi)
        {
            _dataService = dataService;
            _siriusApi = siriusApi;    
        }
        
        public async Task End(string taskId, Instance instance)
        {
            // Transfer from Task_1 to Task_2, need to download the PDF from tax.
            if (taskId.Equals("Task_1"))
            {
                DataElement dataElement = instance.Data.FirstOrDefault(d => d.DataType.Equals("næringsoppgave"));
                if (dataElement != null)
                {
                    string app = instance.AppId.Split("/")[1];
                    Stream næringsStream = await _dataService.GetBinaryData(instance.Org, app, Convert.ToInt32(instance.InstanceOwner.PartyId), new Guid(instance.Id.Split("/")[1]), new Guid(dataElement.Id));
                    Stream næringsPDF = await _siriusApi.GetNæringPDF(næringsStream);
                    await _dataService.InsertBinaryData(instance.Id, "næringsoppgavepdf", "application/pdf", "NæringPDF", næringsPDF);
                }
            }
        }
    }
}

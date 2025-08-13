using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Interface;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTestsRef.Data.apps.tdd.sirius.services;
using Microsoft.AspNetCore.Mvc.ModelBinding;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.tdd.sirius.AppLogic.Validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class ValidationHandler: IInstanceValidator
    {
        private readonly IData _dataService;
        private readonly ISiriusApi _siriusApi;

        public ValidationHandler(IData dataService, ISiriusApi siriusApi)
        {
            _dataService = dataService;
            _siriusApi = siriusApi;
        }

        public async Task ValidateData(object instance, ModelStateDictionary validationResults)
        {   
            await Task.CompletedTask;
        }

        public async Task ValidateTask(Instance instance, string taskId, ModelStateDictionary validationResults)
        {
            if (taskId.Equals("Task_1"))
            {
                DataElement dataElement = instance.Data.FirstOrDefault(d => d.DataType.Equals("næringsoppgave"));
                if (dataElement != null)
                {
                    string app = instance.AppId.Split("/")[1];

                    Stream næringsStream = await _dataService.GetBinaryData(instance.Org, app, Convert.ToInt32(instance.InstanceOwner.PartyId), new Guid(instance.Id.Split("/")[1]), new Guid(dataElement.Id));
                    bool isValidNæring = await _siriusApi.IsValidNæring(næringsStream);
                    if (!isValidNæring)
                    {
                        validationResults.AddModelError(string.Empty, "invalid.næring");
                    }
                }
            }

            await Task.CompletedTask;
        }
    }
}

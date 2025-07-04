using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Models.Model2;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Code;

public class FailServiceTask : IServiceTask
{
    private readonly IDataClient _dataClient;

    public FailServiceTask(IDataClient dataClient)
    {
        _dataClient = dataClient;
    }
    
    public string Type => "fail";

    public async Task<ServiceTaskResult> Execute(ServiceTaskParameters parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;
        
        DataElement dataElement = instance.Data.Find(x => x.DataType == "Model2");

        var instanceIdentifier = new InstanceIdentifier(instance);
        var formData = (Model2)await _dataClient.GetFormData(instanceIdentifier.InstanceGuid, typeof(Model2), instance.Org, instance.AppId, int.Parse(instance.InstanceOwner.PartyId), Guid.Parse(dataElement.Id));

        if (formData.fail.HasValue && formData.fail.Value)
        {
            return new ServiceTaskFailedResult
            {
                ErrorTitle = "Something went wrong",
                ErrorMessage = "The service task failed intentionally. Try again later?",
                ErrorType = ProcessErrorType.Conflict
            };
        }

        return new ServiceTaskSuccessResult();
    }
}
using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Models.Model2;
using Altinn.App.Models.Model3;
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

        DataElement dataElement2 = instance.Data.Find(x => x.DataType == "Model2");
        DataElement dataElement3 = instance.Data.Find(x => x.DataType == "Model3");

        var instanceIdentifier = new InstanceIdentifier(instance);
        var formDataModel2 = (Model2)
            await _dataClient.GetFormData(
                instanceIdentifier.InstanceGuid,
                typeof(Model2),
                instance.Org,
                instance.AppId,
                int.Parse(instance.InstanceOwner.PartyId),
                Guid.Parse(dataElement2.Id)
            );

        var formDataModel3 = (Model3)
            await _dataClient.GetFormData(
                instanceIdentifier.InstanceGuid,
                typeof(Model3),
                instance.Org,
                instance.AppId,
                int.Parse(instance.InstanceOwner.PartyId),
                Guid.Parse(dataElement3.Id)
            );

        if (
            formDataModel2.fail.HasValue
            && formDataModel2.fail.Value
            && (!formDataModel3.fail.HasValue || formDataModel3.fail.Value)
        )
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

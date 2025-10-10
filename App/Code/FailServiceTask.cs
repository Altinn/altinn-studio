using System.Threading.Tasks;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Models;
using Altinn.App.Models.Model2;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Code;

public class FailServiceTask : IServiceTask
{
    private readonly IDataClient _dataClient;

    public FailServiceTask(IDataClient dataClient)
    {
        _dataClient = dataClient;
    }

    public string Type => "fail";

    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        Instance instance = context.InstanceDataMutator.Instance;

        DataElement dataElement2 = instance.Data.Find(x => x.DataType == "Model2");

        var formDataModel2 = (Model2)
            await context.InstanceDataMutator.GetFormData(new DataElementIdentifier(dataElement2));

        if (
            formDataModel2.fail.HasValue
            && formDataModel2.fail.Value
        )
        {
            return ServiceTaskResult.Failed();
        }

        return ServiceTaskResult.Success();
    }
}

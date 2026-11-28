using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Data;
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

        if (formDataModel2.fail.HasValue && formDataModel2.fail.Value)
        {
            // v8 stopped here and let the user reject back to Task_Utfylling2. In v9 a failed service task can only
            // be retried, so send the instance back with the reject action the process already routes.
            return ServiceTaskResult.Success("reject");
        }

        return ServiceTaskResult.Success();
    }
}

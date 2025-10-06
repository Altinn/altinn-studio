using System.Threading.Tasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Models;
using Altinn.App.Models.model;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Code;

public class ExampleServiceTask : IServiceTask
{
    public string Type => "exampleServiceTask";

    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        Instance instance = context.InstanceDataMutator.Instance;
        DataElement dataElement = instance.Data.Find(x => x.DataType == "model");

        var formData = (model)
            await context.InstanceDataMutator.GetFormData(new DataElementIdentifier(dataElement));

        if (formData.property1 != "true")
            return new ServiceTaskFailedResult();

        return new ServiceTaskSuccessResult();
    }
}

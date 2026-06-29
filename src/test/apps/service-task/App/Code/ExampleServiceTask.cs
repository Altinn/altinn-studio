using System.Threading.Tasks;
using Altinn.App.Core.Features.Process;
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
            return ServiceTaskResult.FailedPermanent("property1 must be 'true' for the service task to succeed.");

        return ServiceTaskResult.Success();
    }
}

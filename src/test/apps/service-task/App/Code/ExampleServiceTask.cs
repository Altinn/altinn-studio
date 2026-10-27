using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Models;
using Altinn.App.Models.model;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Code;

public class ExampleServiceTask : IServiceTask
{
    public string Type => "exampleServiceTask";

    public ServiceTaskPipeline Define(PipelineBuilder pipeline) => pipeline.Finally(Execute);

    public async Task<ServiceTaskResult> Execute(StageContext context)
    {
        Instance instance = context.InstanceDataMutator.Instance;
        DataElement dataElement =
            instance.Data.Find(x => x.DataType == "model")
            ?? throw new InvalidOperationException("Expected a 'model' data element on the instance.");

        var formData = (model)
            await context.InstanceDataMutator.GetFormData(new DataElementIdentifier(dataElement));

        if (formData.property1 != "true")
            return ServiceTaskResult.FailedPermanent("property1 must be 'true' for the service task to succeed.");

        return ServiceTaskResult.Success();
    }
}

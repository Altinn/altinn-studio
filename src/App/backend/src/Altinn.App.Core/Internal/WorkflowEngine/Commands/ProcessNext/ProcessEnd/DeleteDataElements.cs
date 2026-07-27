using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

internal sealed class DeleteDataElementsIfConfigured : IWorkflowEngineCommand
{
    public static string Key => "DeleteDataElementsIfConfigured";

    public string GetKey() => Key;

    private readonly IAppMetadata _appMetadata;

    public DeleteDataElementsIfConfigured(IAppMetadata appMetadata)
    {
        _appMetadata = appMetadata;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        List<string> typesToDelete = applicationMetadata
            .DataTypes.Where(dt => dt?.AppLogic?.AutoDeleteOnProcessEnd == true)
            .Select(dt => dt.Id)
            .ToList();

        if (typesToDelete.Count == 0)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        Instance instance = parameters.InstanceDataMutator.Instance;
        List<DataElement> elementsToDelete = instance.Data.Where(e => typesToDelete.Contains(e.DataType)).ToList();

        foreach (DataElement item in elementsToDelete)
        {
            parameters.InstanceDataMutator.RemoveDataElement(item);
        }

        return new SuccessfulProcessEngineCommandResult();
    }
}

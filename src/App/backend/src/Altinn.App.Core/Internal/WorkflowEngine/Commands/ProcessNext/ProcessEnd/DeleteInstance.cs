using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

internal sealed class DeleteInstanceIfConfigured : IWorkflowEngineCommand
{
    public static string Key => "DeleteInstanceIfConfigured";

    public string GetKey() => Key;

    private readonly IAppMetadata _appMetadata;

    public DeleteInstanceIfConfigured(IAppMetadata appMetadata)
    {
        _appMetadata = appMetadata;
    }

    public async Task<ProcessEngineCommandResult> Execute(ProcessEngineCommandContext parameters)
    {
        Instance instance = parameters.InstanceDataMutator.Instance;

        if (instance.Process?.Ended is null)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        if (applicationMetadata.AutoDeleteOnProcessEnd is not true)
        {
            return new SuccessfulProcessEngineCommandResult();
        }

        try
        {
            if (parameters.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    "Workflow instance deletion requires callback state restored into an InstanceDataUnitOfWork.",
                    "InvalidOperationException"
                );
            }

            unitOfWork.StageInstanceDeletion();
            return new SuccessfulProcessEngineCommandResult();
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }
}

using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivServiceTask : IPostCommitServiceTask
{
    private readonly ILogger<FiksArkivServiceTask> _logger;
    private readonly IFiksArkivHost _fiksArkivHost;
    private readonly FiksArkivSettings _fiksArkivSettings;

    public string Type => AltinnTaskTypes.FiksArkiv;

    public FiksArkivServiceTask(
        IFiksArkivHost fiksArkivHost,
        IOptions<FiksArkivSettings> fiksArkivSettings,
        ILogger<FiksArkivServiceTask> logger
    )
    {
        _fiksArkivHost = fiksArkivHost;
        _fiksArkivSettings = fiksArkivSettings.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ServiceTaskResult> Execute(ServiceTaskContext context)
    {
        try
        {
            Instance instance = context.InstanceDataMutator.Instance;
            string taskId = instance.Process.CurrentTask.ElementId;

            _logger.LogInformation(
                "FiksArkivServiceTask is executing for instance {InstanceId} and task {TaskId}",
                instance.Id,
                taskId
            );

            await _fiksArkivHost.StageArchiveRecordForMessage(
                taskId,
                instance,
                FiksArkivConstants.MessageTypes.CreateArchiveRecord,
                context.InstanceDataMutator,
                context.CancellationToken
            );

            return ServiceTaskResult.SuccessWithoutAutoAdvance();
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error occurred while staging FiksArkivServiceTask: {ErrorMessage}", e.Message);
            return ServiceTaskResult.FailedRetryable(e.Message);
        }
    }

    public async Task<ServiceTaskResult> ExecutePostCommit(ServiceTaskContext context)
    {
        try
        {
            Instance instance = context.InstanceDataMutator.Instance;
            string taskId = instance.Process.CurrentTask.ElementId;

            _logger.LogInformation(
                "FiksArkivServiceTask is sending post-commit for instance {InstanceId} and task {TaskId}",
                instance.Id,
                taskId
            );

            var response = await _fiksArkivHost.SendStagedMessage(
                taskId,
                instance,
                FiksArkivConstants.MessageTypes.CreateArchiveRecord,
                context.InstanceDataMutator,
                context.CancellationToken
            );

            _logger.LogInformation(
                "FiksArkivServiceTask completed for instance {InstanceId} with response: {Response}",
                instance.Id,
                response
            );

            return ServiceTaskResult.Success();
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error occurred while executing FiksArkivServiceTask: {ErrorMessage}", e.Message);

            if (_fiksArkivSettings.ErrorHandling?.MoveToNextTask is true)
            {
                return ServiceTaskResult.Success(action: _fiksArkivSettings.ErrorHandling.GetActionOrDefault());
            }

            return ServiceTaskResult.FailedRetryable(e.Message);
        }
    }
}

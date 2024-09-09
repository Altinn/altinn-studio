using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ServiceTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;

/// <summary>
/// This event handler is responsible for handling the end event for a process task.
/// </summary>
public class EndTaskEventHandler : IEndTaskEventHandler
{
    private readonly IProcessTaskDataLocker _processTaskDataLocker;
    private readonly IProcessTaskFinalizer _processTaskFinisher;
    private readonly IServiceTask _pdfServiceTask;
    private readonly IServiceTask _eformidlingServiceTask;
    private readonly IEnumerable<IProcessTaskEnd> _processTaskEnds;
    private readonly ILogger<EndTaskEventHandler> _logger;

    /// <summary>
    /// This event handler is responsible for handling the end event for a process task.
    /// </summary>
    public EndTaskEventHandler(
        IProcessTaskDataLocker processTaskDataLocker,
        IProcessTaskFinalizer processTaskFinisher,
        IEnumerable<IServiceTask> serviceTasks,
        IEnumerable<IProcessTaskEnd> processTaskEnds,
        ILogger<EndTaskEventHandler> logger
    )
    {
        _processTaskDataLocker = processTaskDataLocker;
        _processTaskFinisher = processTaskFinisher;
        _pdfServiceTask =
            serviceTasks.FirstOrDefault(x => x is IPdfServiceTask)
            ?? throw new InvalidOperationException("PdfServiceTask not found in serviceTasks");
        _eformidlingServiceTask =
            serviceTasks.FirstOrDefault(x => x is IEformidlingServiceTask)
            ?? throw new InvalidOperationException("EformidlingServiceTask not found in serviceTasks");
        _processTaskEnds = processTaskEnds;
        _logger = logger;
    }

    /// <summary>
    /// Execute the event handler logic.
    /// </summary>
    public async Task Execute(IProcessTask processTask, string taskId, Instance instance)
    {
        await processTask.End(taskId, instance);
        await _processTaskFinisher.Finalize(taskId, instance);
        await RunAppDefinedProcessTaskEndHandlers(taskId, instance);
        await _processTaskDataLocker.Lock(taskId, instance);

        //These two services are scheduled to be removed and replaced by services tasks defined in the processfile.
        try
        {
            await _pdfServiceTask.Execute(taskId, instance);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error executing pdf service task. Unlocking data again.");
            await _processTaskDataLocker.Unlock(taskId, instance);
            throw;
        }

        try
        {
            await _eformidlingServiceTask.Execute(taskId, instance);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error executing eFormidling service task. Unlocking data again.");
            await _processTaskDataLocker.Unlock(taskId, instance);
            throw;
        }
    }

    /// <summary>
    /// Runs IProcessTaskEnds defined in the app.
    /// </summary>
    private async Task RunAppDefinedProcessTaskEndHandlers(string endEvent, Instance instance)
    {
        foreach (IProcessTaskEnd taskEnd in _processTaskEnds)
        {
            await taskEnd.End(endEvent, instance);
        }
    }
}

using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;

/// <summary>
/// This event handler is responsible for handling the start event for a process task.
/// </summary>
public class StartTaskEventHandler : IStartTaskEventHandler
{
    private readonly IProcessTaskDataLocker _processTaskDataLocker;
    private readonly IProcessTaskInitializer _processTaskInitializer;
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// This event handler is responsible for handling the start event for a process task.
    /// </summary>
    public StartTaskEventHandler(
        IProcessTaskDataLocker processTaskDataLocker,
        IProcessTaskInitializer processTaskInitializer,
        IServiceProvider serviceProvider
    )
    {
        _processTaskDataLocker = processTaskDataLocker;
        _processTaskInitializer = processTaskInitializer;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Execute the event handler logic.
    /// </summary>
    public async Task Execute(
        IProcessTask processTask,
        string taskId,
        Instance instance,
        Dictionary<string, string>? prefill
    )
    {
        await _processTaskDataLocker.Unlock(taskId, instance);
        await RunAppDefinedProcessTaskStartHandlers(taskId, instance, prefill);
        await _processTaskInitializer.Initialize(taskId, instance, prefill);
        await processTask.Start(taskId, instance);
    }

    /// <summary>
    /// Runs IProcessTaskStarts defined in the app.
    /// </summary>
    private async Task RunAppDefinedProcessTaskStartHandlers(
        string taskId,
        Instance instance,
        Dictionary<string, string>? prefill
    )
    {
        var handlers = _appImplementationFactory.GetAll<IProcessTaskStart>();
        foreach (IProcessTaskStart processTaskStarts in handlers)
        {
            await processTaskStarts.Start(taskId, instance, prefill ?? []);
        }
    }
}

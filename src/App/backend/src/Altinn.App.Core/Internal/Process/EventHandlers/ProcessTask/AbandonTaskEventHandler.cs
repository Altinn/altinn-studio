using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;

/// <summary>
/// This event handler is responsible for handling the abandon event for a process task.
/// </summary>
public class AbandonTaskEventHandler : IAbandonTaskEventHandler
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// This event handler is responsible for handling the abandon event for a process task.
    /// </summary>
    public AbandonTaskEventHandler(IServiceProvider serviceProvider)
    {
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Handles the abandon event for a process task.
    /// </summary>
    public async Task Execute(IProcessTask processTask, string taskId, Instance instance)
    {
        await processTask.Abandon(taskId, instance);
        await RunAppDefinedProcessTaskAbandonHandlers(taskId, instance);
    }

    /// <summary>
    /// Runs IProcessTaskAbandons defined in the app.
    /// </summary>
    private async Task RunAppDefinedProcessTaskAbandonHandlers(string taskId, Instance instance)
    {
        var handlers = _appImplementationFactory.GetAll<IProcessTaskAbandon>();
        foreach (IProcessTaskAbandon handler in handlers)
        {
            await handler.Abandon(taskId, instance);
        }
    }
}

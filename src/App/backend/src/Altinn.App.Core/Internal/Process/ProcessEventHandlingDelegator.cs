using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.EventHandlers;
using Altinn.App.Core.Internal.Process.EventHandlers.ProcessTask;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// This class is responsible for delegating process events to the correct event handler.
/// </summary>
public class ProcessEventHandlingDelegator : IProcessEventHandlerDelegator
{
    private readonly ILogger<ProcessEventHandlingDelegator> _logger;
    private readonly IStartTaskEventHandler _startTaskEventHandler;
    private readonly IEndTaskEventHandler _endTaskEventHandler;
    private readonly IAbandonTaskEventHandler _abandonTaskEventHandler;
    private readonly IEndEventEventHandler _endEventHandler;
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// This class is responsible for delegating process events to the correct event handler.
    /// </summary>
    public ProcessEventHandlingDelegator(
        ILogger<ProcessEventHandlingDelegator> logger,
        IStartTaskEventHandler startTaskEventHandler,
        IEndTaskEventHandler endTaskEventHandler,
        IAbandonTaskEventHandler abandonTaskEventHandler,
        IEndEventEventHandler endEventHandler,
        IServiceProvider serviceProvider
    )
    {
        _logger = logger;
        _startTaskEventHandler = startTaskEventHandler;
        _endTaskEventHandler = endTaskEventHandler;
        _abandonTaskEventHandler = abandonTaskEventHandler;
        _endEventHandler = endEventHandler;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
    }

    /// <summary>
    /// Loops through all events and delegates the event to the correct event handler.
    /// </summary>
    public async Task HandleEvents(Instance instance, Dictionary<string, string>? prefill, List<InstanceEvent>? events)
    {
        if (events == null)
        {
            return;
        }

        foreach (InstanceEvent instanceEvent in events)
        {
            if (Enum.TryParse(instanceEvent.EventType, true, out InstanceEventType eventType))
            {
                string? taskId = instanceEvent.ProcessInfo?.CurrentTask?.ElementId;
                if (instanceEvent.ProcessInfo?.CurrentTask != null && string.IsNullOrEmpty(taskId))
                {
                    throw new ProcessException(
                        $"Unable to parse taskId from CurrentTask on instance event {eventType} ({instanceEvent.Id})"
                    );
                }

                string? altinnTaskType = instanceEvent.ProcessInfo?.CurrentTask?.AltinnTaskType;

                switch (eventType)
                {
                    case InstanceEventType.process_StartEvent:
                        break;
                    case InstanceEventType.process_StartTask:
                        // ! TODO: figure out why taskId can be null here
                        await _startTaskEventHandler.Execute(
                            GetProcessTaskInstance(altinnTaskType),
                            taskId!,
                            instance,
                            prefill
                        );
                        break;
                    case InstanceEventType.process_EndTask:
                        // ! TODO: figure out why taskId can be null here
                        await _endTaskEventHandler.Execute(GetProcessTaskInstance(altinnTaskType), taskId!, instance);
                        break;
                    case InstanceEventType.process_AbandonTask:
                        // InstanceEventType is set to Abandon when action performed is `Reject`. This is to keep backwards compatability with existing code that only should be run when a task is abandoned/rejected.
                        // ! TODO: figure out why taskId can be null here
                        await _abandonTaskEventHandler.Execute(
                            GetProcessTaskInstance(altinnTaskType),
                            taskId!,
                            instance
                        );
                        break;
                    case InstanceEventType.process_EndEvent:
                        await _endEventHandler.Execute(instanceEvent, instance);
                        break;
                }
            }
            else
            {
                _logger.LogError("Unable to parse instanceEvent eventType {EventType}", instanceEvent.EventType);
            }
        }
    }

    /// <summary>
    /// Identify the correct task implementation
    /// </summary>
    private IProcessTask GetProcessTaskInstance(string? altinnTaskType)
    {
        if (string.IsNullOrEmpty(altinnTaskType))
        {
            altinnTaskType = "NullType";
        }

        IEnumerable<IServiceTask> serviceTasks = _appImplementationFactory.GetAll<IServiceTask>();
        IServiceTask? serviceTask = serviceTasks.FirstOrDefault(pt => pt.Type == altinnTaskType);

        if (serviceTask is not null)
        {
            return serviceTask;
        }

        var tasks = _appImplementationFactory.GetAll<IProcessTask>();
        IProcessTask? processTask = tasks.FirstOrDefault(pt => pt.Type == altinnTaskType);

        if (processTask == null)
        {
            throw new ProcessException($"No process task instance found for altinnTaskType {altinnTaskType}");
        }

        return processTask;
    }
}

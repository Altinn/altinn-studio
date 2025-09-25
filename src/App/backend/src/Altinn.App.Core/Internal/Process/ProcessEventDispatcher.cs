using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Instances;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Default implementation of the process event dispatcher
/// </summary>
public class ProcessEventDispatcher : IProcessEventDispatcher
{
    private readonly IInstanceClient _instanceClient;
    private readonly IEventsClient _eventsClient;
    private readonly IOptions<AppSettings> _appSettings;
    private readonly ILogger<ProcessEventDispatcher> _logger;

    /// <summary>
    /// Default implementation of the process event dispatcher
    /// </summary>
    public ProcessEventDispatcher(
        IInstanceClient instanceClient,
        IEventsClient eventsClient,
        IOptions<AppSettings> appSettings,
        ILogger<ProcessEventDispatcher> logger
    )
    {
        _instanceClient = instanceClient;
        _eventsClient = eventsClient;
        _appSettings = appSettings;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<Instance> DispatchToStorage(Instance instance, List<InstanceEvent>? events)
    {
        Instance updatedInstance = await _instanceClient.UpdateProcessAndEvents(instance, events ?? []);

        return updatedInstance;
    }

    /// <inheritdoc/>
    public async Task RegisterEventWithEventsComponent(Instance instance)
    {
        if (_appSettings.Value.RegisterEventsWithEventsComponent)
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(instance.Process.CurrentTask?.ElementId))
                {
                    await _eventsClient.AddEvent(
                        $"app.instance.process.movedTo.{instance.Process.CurrentTask.ElementId}",
                        instance
                    );
                }
                else if (instance.Process.EndEvent != null)
                {
                    await _eventsClient.AddEvent("app.instance.process.completed", instance);
                }
            }
            catch (Exception exception)
            {
                _logger.LogWarning(exception, "Exception when sending event with the Events component");
            }
        }
    }
}

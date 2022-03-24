using System.Threading.Tasks;
using Altinn.Platform.Authorization.Functions.Models;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;
using Microsoft.Azure.WebJobs;

// ReSharper disable UnusedMember.Global
namespace Altinn.Platform.Authorization.Functions;

/// <summary>
/// Function endpoint for handling delegation events
/// </summary>
public class DelegationEvents
{
    private readonly IEventPusherService _eventPusherService;

    /// <summary>
    /// Initializes a new instance of the <see cref="DelegationEvents"/> class.
    /// </summary>
    /// <param name="eventPusherService">The event pusher service.</param>
    public DelegationEvents(IEventPusherService eventPusherService)
    {
        _eventPusherService = eventPusherService;
    }

    /// <summary>
    /// Function endpoint with a queue trigger. 
    /// </summary>
    /// <param name="queueItem">The delegation change event as a serialized queue item. </param>
    /// <remarks>
    /// We cannot use a POCO here without introducing JSON.NET as a dependency, as the Storage SDK
    /// uses JSON.NET to deserialize. Therefore we use a string as input, and deserialize manually.
    /// 
    /// See https://github.com/Azure/azure-webjobs-sdk/blob/v3.0.32/src/Microsoft.Azure.WebJobs.Extensions.Storage/Queues/Triggers/UserTypeArgumentBindingProvider.cs#L57
    ///     https://github.com/Azure/azure-functions-host/issues/5469
    /// </remarks>
    /// <seealso cref="Factories.CustomQueueProcessorFactory"/>
    [FunctionName(nameof(DelegationEvents))]
    public async Task RunAsync([QueueTrigger("delegationevents", Connection = "QueueStorage")] string queueItem)
    {
        DelegationChangeEventList delegationChangeEventList =
            System.Text.Json.JsonSerializer.Deserialize<DelegationChangeEventList>(queueItem);
        await _eventPusherService.PushEvents(delegationChangeEventList);
    }
}

using Altinn.Platform.Authorization.Functions.Models;
using Altinn.Platform.Authorization.Functions.Services.Interfaces;
using Microsoft.Azure.WebJobs;

namespace Altinn.Platform.Authorization.Functions
{
    public class DelegationEvents
    {
        private readonly IEventPusherService _eventPusherService;

        public DelegationEvents(IEventPusherService eventPusherService)
        {
            _eventPusherService = eventPusherService;
        }

        [FunctionName(nameof(DelegationEvents))]
        public void Run([QueueTrigger("delegationevents", Connection = "QueueStorage")] DelegationChangeEventList delegationChangeEvent)
        {
            _eventPusherService.PushEvents(delegationChangeEvent);
        }
    }
}

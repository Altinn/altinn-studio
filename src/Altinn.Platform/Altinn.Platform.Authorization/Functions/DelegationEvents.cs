using System;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Functions.Exceptions;
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
        public async Task RunAsync([QueueTrigger("delegationevents", Connection = "QueueStorage")] DelegationChangeEventList delegationChangeEvent)
        {
            await _eventPusherService.PushEvents(delegationChangeEvent);
        }
    }
}

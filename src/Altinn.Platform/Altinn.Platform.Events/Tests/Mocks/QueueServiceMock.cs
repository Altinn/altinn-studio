using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

using Altinn.Platform.Events.Models;
using Altinn.Platform.Events.Services.Interfaces;

namespace Altinn.Platform.Events.Tests.Mocks
{
    public class QueueServiceMock : IQueueService
    {
        public Task<PushQueueReceipt> PushToQueue(string content)
        {
            return Task.FromResult(new PushQueueReceipt { Success = true});
        }
    }
}

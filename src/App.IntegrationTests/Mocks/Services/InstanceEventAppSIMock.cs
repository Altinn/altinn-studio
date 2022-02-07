using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// App implementation of the instance events service, for saving to and retrieving from Platform Storage.
    /// </summary>
    public class InstanceEventAppSIMock : IInstanceEvent
    {
        /// <inheritdoc/>
        public Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string instanceOwnerId, string org, string app, string[] eventTypes, string from, string to)
        {
            return Task.FromResult(new List<InstanceEvent>());
        }

        /// <inheritdoc/>
        public Task<string> SaveInstanceEvent(object dataToSerialize, string org, string app)
        {
            return Task.FromResult("mocked");
        }
    }
}

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Services.Interfaces
{
    /// <summary>
    /// Interface to talk to the events service
    /// </summary>
    public interface IEventsService
    {
        /// <summary>
        /// Stores a cloud event document to the events database.
        /// </summary>
        /// <param name="cloudEvent">The cloudEvent to be stored</param>
        /// <returns>Id for the created document</returns>
        Task<string> StoreCloudEvent(CloudEvent cloudEvent);

        /// <summary>
        /// Gets list of cloud event based on query params
        /// </summary>
        Task<List<CloudEvent>> Get(string after, DateTime? from, DateTime? to, int partyId, List<string> source, List<string> type, int size = 50);
    }
}

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Interface to talk to the events repository
    /// </summary>
    public interface IEventsRepository
    {
        /// <summary>
        /// Creates an cloud event in repository
        /// </summary>
        /// <param name="item">the cloud event object</param>
        /// <returns>id for created cloudevent</returns>
        Task<string> Create(CloudEvent item);

        /// <summary>
        /// Gets list of cloud event based on query params
        /// </summary>
        Task<List<CloudEvent>> Get(string after, DateTime? from, DateTime? to, int partyId, List<string> source, List<string> type, int size);
    }
}

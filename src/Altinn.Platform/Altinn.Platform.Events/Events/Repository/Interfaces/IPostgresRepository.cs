using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Repository.Interfaces
{
    /// <summary>
    /// Interface to talk to the events repository
    /// </summary>
    public interface IPostgresRepository
    {
        /// <summary>
        /// Creates an cloud event in repository
        /// </summary>
        /// <param name="cloudEvent">the cloud event object</param>
        /// <returns>id for created cloudevent</returns>
        Task<string> Create(CloudEvent cloudEvent);

        /// <summary>
        /// Calls a function to retrieve cloud events based on query params
        /// </summary>
        Task<List<CloudEvent>> Get(string after, DateTime? from, DateTime? to, string subject, List<string> source, List<string> type, int size);
    }
}

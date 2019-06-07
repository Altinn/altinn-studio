using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Interface for interaction with InstanceEvent Repository
    /// </summary>
    public interface IInstanceEventRepository
    {
        /// <summary>
        /// Inserts new instance event into the instanceEvent collection.
        /// </summary>
        /// <param name="instanceEvent">Instance event to be stored. </param>
        /// <returns>The stored instance event.</returns>
        Task<InstanceEvent> InsertInstanceEvent(InstanceEvent instanceEvent);

        /// <summary>
        /// Retrieves all instance events related to given instance id, listed event types, and given time frame from instanceEvent collection.
        /// </summary>
        /// <param name="instanceId"> Id of instance to retrieve events for. </param>
        /// <param name="eventTypes">Array of event types to filter the events by. </param>
        /// <param name="fromDateTime"> Lower bound for DateTime span to filter events by.</param>
        /// <param name="toDateTime"> Upper bound for DateTime span to filter events by.</param>
        /// <returns>List of instance events.</returns>
        Task<List<InstanceEvent>> ListInstanceEvents(string instanceId, string[] eventTypes, DateTime? fromDateTime, DateTime? toDateTime);

        /// <summary>
        /// Deletes all events related to an instance id.
        /// </summary>
        /// <param name="instanceId">Id of instance to retrieve events for. </param>
        /// <returns>Number of deleted instance events.</returns>
        Task<int> DeleteAllInstanceEvents(string instanceId);
    }
}

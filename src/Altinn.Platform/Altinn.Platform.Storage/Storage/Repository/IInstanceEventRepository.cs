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
        /// InsertSummary
        /// </summary>
        /// <param name="instanceEvent"> insert description </param>
        /// <returns>Insert description</returns>
        Task<InstanceEvent> InsertInstanceEvent(InstanceEvent instanceEvent);

        /// <summary>
        /// InsertSummary
        /// </summary>
        /// <param name="instanceId"> insert description </param>
        /// <returns>Insert description</returns>
        Task<List<InstanceEvent>> ListAllInstanceEvents(string instanceId);

        /// <summary>
        /// InsertSummary
        /// </summary>
        /// <param name="instanceId"> insert description </param>
        /// <param name="eventTypes"> insertt description </param>
        /// <returns>Insert description</returns>
        Task<List<InstanceEvent>> ListInstanceEventsSpecificEventTypes(string instanceId, List<string> eventTypes);

        /// <summary>
        /// InsertSummary
        /// </summary>
        /// <param name="instanceId"> insert description </param>
        /// <param name="fromDateTime"> insertt description </param>
        /// <param name="toDateTime"> inserttt description </param>
        /// <returns>Insert description</returns>
        Task<List<InstanceEvent>> ListInstanceEventsTimeFrame(string instanceId, DateTime fromDateTime, DateTime toDateTime);

        /// <summary>
        /// InsertSummary
        /// </summary>
        /// <param name="instanceId"> insert description </param>
        /// <returns>Insert description</returns>
        Task<int> DeleteAllInstanceEvents(string instanceId);
    }

}

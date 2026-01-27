using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// Interface for interaction with InstanceEvent Repository
/// </summary>
public interface IInstanceEventRepository
{
    /// <summary>
    /// Inserts new instance event into the instanceEvent collection.
    /// </summary>
    /// <param name="instanceEvent">Instance event to be stored. </param>
    /// <param name="instance">The parent instance</param>
    /// <returns>The stored instance event.</returns>
    Task<InstanceEvent> InsertInstanceEvent(InstanceEvent instanceEvent, Instance instance = null);

    /// <summary>
    /// Gets one event.
    /// </summary>
    /// <param name="instanceId">The instance id</param>
    /// <param name="eventGuid">The guid to retrieve </param>
    /// <returns>The stored instance event.</returns>
    Task<InstanceEvent> GetOneEvent(string instanceId, Guid eventGuid);

    /// <summary>
    /// Retrieves all instance events related to given instance id, listed event types, and given time frame from instanceEvent collection.
    /// </summary>
    /// <param name="instanceId"> Id of instance to retrieve events for. </param>
    /// <param name="eventTypes">Array of event types to filter the events by. </param>
    /// <param name="fromDateTime"> Lower bound for DateTime span to filter events by.</param>
    /// <param name="toDateTime"> Upper bound for DateTime span to filter events by.</param>
    /// <returns>List of instance events.</returns>
    Task<List<InstanceEvent>> ListInstanceEvents(
        string instanceId,
        string[] eventTypes,
        DateTime? fromDateTime,
        DateTime? toDateTime
    );

    /// <summary>
    /// Deletes all events related to an instance id.
    /// </summary>
    /// <param name="instanceId">Id of instance to retrieve events for. </param>
    /// <returns>Number of deleted instance events.</returns>
    Task<int> DeleteAllInstanceEvents(string instanceId);
}

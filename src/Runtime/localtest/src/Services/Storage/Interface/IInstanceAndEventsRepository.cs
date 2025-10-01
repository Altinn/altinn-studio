using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Repository;

/// <summary>
/// Represents an implementation of <see cref="IInstanceAndEventsRepository"/>.
/// </summary>
public interface IInstanceAndEventsRepository 
{
    /// <summary>
    /// update existing instance including instance events
    /// </summary>
    /// <param name="instance">the instance to update</param>
    /// <param name="updateProperties">a list of which properties should be updated</param>
    /// <param name="events">the events to add</param>
    /// <returns>The updated instance</returns>
    Task<Instance> Update(Instance instance, List<string> updateProperties, List<InstanceEvent> events);
}

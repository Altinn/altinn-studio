using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Services
{
    /// <summary>
    /// This interface describes the required methods and features of an instance event service implementation.
    /// </summary>
    public interface IInstanceEventService
    {
        /// <summary>
        /// Construct an instance event given a type
        /// </summary>
        /// <param name="eventType">Event type</param>
        /// <param name="instance">Instance</param>
        /// <returns></returns>
        public InstanceEvent BuildInstanceEvent(InstanceEventType eventType, Instance instance);
        
        /// <summary>
        /// Dispatch an instance event to the repository
        /// </summary>
        /// <param name="eventType">The event type</param>
        /// <param name="instance">The instance the event is related to</param>
        public Task DispatchEvent(InstanceEventType eventType, Instance instance);

        /// <summary>
        /// Dispatch an instance event related to a data elementto the repository
        /// </summary>
        /// <param name="eventType">The event type</param>
        /// <param name="instance">The instance the event is related to</param>
        /// <param name="dataElement">The data element the event is related to</param>
        public Task DispatchEvent(InstanceEventType eventType, Instance instance, DataElement dataElement);
    }
}

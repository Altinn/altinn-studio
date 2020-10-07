using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Interface to talk to the events repository
    /// </summary>
    public interface INewEventsRepository
    {
        /// <summary>
        /// Creates an cloud event in repository
        /// </summary>
        /// <param name="item">the cloud event object</param>
        /// <returns>id for created cloudevent</returns>
        int Create(CloudEvent item);
    }
}
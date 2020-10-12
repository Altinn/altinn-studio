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
    }
}
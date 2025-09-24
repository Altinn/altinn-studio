using System.Threading.Tasks;
using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Interface describing client implementations for the Events component in the Altinn 3 platform.
    /// </summary>
    public interface IEventsRepository
    {
        /// <summary>
        /// Creates an cloud event in repository
        /// </summary>
        /// <param name="item">the cloud event object</param>
        /// <returns>id for created cloudevent</returns>
        Task<string> Create(CloudEvent item);
    }
}

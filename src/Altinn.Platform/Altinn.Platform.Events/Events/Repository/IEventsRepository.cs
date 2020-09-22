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
    }
}

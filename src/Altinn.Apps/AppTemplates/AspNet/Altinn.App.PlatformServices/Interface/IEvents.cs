using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Interface
{
    /// <summary>
    /// Interface describing client implementations for the Events component in the Altinn 3 platform.
    /// </summary>
    public interface IEvents
    {
        /// <summary>
        /// Adds a new event to the events published by the Events component.
        /// </summary>
        Task<string> AddEvent(CloudEvent cloudEvent);
    }
}

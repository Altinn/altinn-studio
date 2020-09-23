using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.PlatformWrappers
{
    /// <summary>
    /// Interface describing client abstractions for the Events component in the Altinn 3 platform.
    /// </summary>
    public interface IEventsWrapper
    {
        /// <summary>
        /// Add a new event of the given type using data from the instance to populate the event.
        /// </summary>
        /// <param name="eventType">The type of event that occured.</param>
        /// <param name="instance">The target instance of the event.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task AddEvent(string eventType, Instance instance);
    }
}

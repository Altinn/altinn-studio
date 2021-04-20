using System.Threading.Tasks;
using Altinn.Platform.Events.Functions.Models;

namespace Altinn.Platform.Events.Functions.Services.Interfaces
{
    /// <summary>
    /// Interface to handle services exposed in Platform Events Push
    /// </summary>
    public interface IPushEventsService
    {
        /// <summary>
        /// Push cloudevent
        /// </summary>
        /// <param name="item">CloudEvent to push</param>
         Task SendToPushController(CloudEvent item);
    }
}

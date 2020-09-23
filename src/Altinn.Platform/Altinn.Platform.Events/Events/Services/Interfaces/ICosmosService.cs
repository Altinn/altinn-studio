using System.Threading.Tasks;
using Altinn.Platform.Events.Models;
using Microsoft.Azure.Documents;

namespace Altinn.Platform.Events.Services.Interfaces
{
    /// <summary>
    /// Interface that exposes cosmos DB functionality
    /// </summary>
    public interface ICosmosService
    {
        /// <summary>
        /// Stores a cloud event document to the events collection.
        /// </summary>
        /// <param name="cloudEvent">The cloud event to be stored</param>
        /// <param name="applyTrigger">Boolean to indicate if trigger should be applied</param>
        /// <returns>Id for the created document</returns>
        public Task<string> StoreEventsDocument(CloudEvent cloudEvent, bool applyTrigger = true);

        /// <summary>
        /// Stores a trigger in the collection.
        /// </summary>
        /// <param name="trigger">The trigger</param>
        public Task StoreTrigger(Trigger trigger);
    }
}

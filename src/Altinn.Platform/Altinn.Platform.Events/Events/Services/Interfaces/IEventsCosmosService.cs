using System.Threading.Tasks;
using Microsoft.Azure.Documents;

namespace Altinn.Platform.Events.Services.Interfaces
{
    /// <summary>
    /// Interface that exposes cosmos DB functionality
    /// </summary>
    public interface IEventsCosmosService
    {
        /// <summary>
        /// Stores a cloud event document to the events collection.
        /// </summary>
        /// <param name="item">The item to be stored</param>
        /// <param name="applyTrigger">Boolean to indicate if trigger should be applied</param>
        /// <returns>Id for the created document</returns>
        public Task<string> StoreItemtToEventsCollection<T>(T item, bool applyTrigger = true);

        /// <summary>
        /// Stores a trigger in the collection.
        /// </summary>
        /// <param name="trigger">The trigger</param>
        /// <returns>True if trigger is successfully stored</returns>
        public Task<bool> StoreTrigger(Trigger trigger);
    }
}

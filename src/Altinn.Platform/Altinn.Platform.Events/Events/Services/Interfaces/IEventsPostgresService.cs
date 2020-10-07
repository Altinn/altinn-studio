using System.Threading.Tasks;
using Altinn.Platform.Events.Models;

namespace Altinn.Platform.Events.Services.Interfaces
{
    /// <summary>
    /// Something smart
    /// </summary>
    public interface IEventsPostgresService
    {
        /// <summary>
        /// Stores a cloud event document to the events database.
        /// </summary>
        /// <param name="cloudEvent">The cloudEvent to be stored</param>
        /// <returns>Id for the created document</returns>
        public int StoreItemtToEventsCollection(CloudEvent cloudEvent);
    }
}
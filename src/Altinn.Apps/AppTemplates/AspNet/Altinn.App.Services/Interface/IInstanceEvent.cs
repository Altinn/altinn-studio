using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for handling instance event related operations
    /// </summary>
    public interface IInstanceEvent
    {
        /// <summary>
        /// Stores the instance event
        /// </summary>
        Task<string> SaveInstanceEvent(object dataToSerialize, string org, string app);

        /// <summary>
        /// Gets the instance events related to the instance matching the instance id. 
        /// </summary>
        Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string instanceOwnerPartyId, string org, string app, string[] eventTypes, string from, string to);

        /// <summary>
        /// Deletes the instance events related to the instance matching the instance id. 
        /// </summary>
        Task<bool> DeleteAllInstanceEvents(string instanceId, string instanceOwnerPartyId, string org, string app);
    }
}

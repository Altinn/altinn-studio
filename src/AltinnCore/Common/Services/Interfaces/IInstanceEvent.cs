using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Enums;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for handling instance event related operations
    /// </summary>
    public interface IInstanceEvent
    {
        /// <summary>
        /// Stores the instance event
        /// </summary>
        Task<string> SaveInstanceEvent(object dataToSerialize, string applicationOwnerId, string applicationId);

        /// <summary>
        /// Gets the instance events related to the instance matching the instance id. 
        /// </summary>
        Task<List<InstanceEvent>> GetInstanceEvents(string instanceId, string instanceOwnderId, string applicationOwnerId, string applicationId, string[] eventTypes, string from, string to);

        /// <summary>
        /// Deletes the instance events related to the instance matching the instance id. 
        /// </summary>
        Task<bool> DeleteAllInstanceEvents(string instanceId, string instanceOwnderId, string applicationOwnerId, string applicationId);
    }
}

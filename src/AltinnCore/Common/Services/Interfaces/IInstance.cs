using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for handling form data related operations
    /// </summary>
    public interface IInstance
    {
        /// <summary>
        /// Gets the instance
        /// </summary>
        Task<Instance> GetInstance(string applicationId, string instanceOwnerId, Guid instanceId);

        /// <summary>
        /// Saves the instance meta data
        /// </summary>
        //void SaveInstance<T>(T dataToSerialize, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId);

        /// <summary>
        /// Stores the form data
        /// </summary>
        Task<Guid> InstantiateInstance(string applicationId, string instanceOwnerId);
    }
}

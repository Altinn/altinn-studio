using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.Common.Models;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;

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
        Task<Instance> GetInstance(string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId);

        /// <summary>
        /// Gets the instance list
        /// </summary>
        Task<List<Instance>> GetInstances(string applicationId, string applicationOwnerId, int instanceOwnerId);

        /// <summary>
        /// Stores the form data
        /// </summary>
        Task<Instance> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation);

        /// <summary>
        /// update instance metadata
        /// </summary>
        Task<Instance> UpdateInstance(object dataToSerialize, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId);

        /// <summary>
        /// update instance metadata
        /// </summary>
        Task<Instance> ArchiveInstance<T>(T dataToSerialize, Type type, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId);
    }
}

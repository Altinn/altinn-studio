using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Models;
using AltinnCore.ServiceLibrary;

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
        /// Stores the form data
        /// </summary>
        Task<Guid> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation);

        /// <summary>
        /// update instance metadata
        /// </summary>
        Task<Instance> UpdateInstance<T>(T dataToSerialize, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId);
    }
}

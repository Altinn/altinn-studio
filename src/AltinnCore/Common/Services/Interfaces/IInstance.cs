using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
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
        Task<Instance> GetInstance(string app, string org, int instanceOwnerId, Guid instanceId);

        /// <summary>
        /// Gets the instance list
        /// </summary>
        Task<List<Instance>> GetInstances(string app, string org, int instanceOwnerId);

        /// <summary>
        /// Stores the form data
        /// </summary>
        [Obsolete("Method is deprecated, please use CreateInstance instead")]
        Task<Instance> InstantiateInstance(StartServiceModel startServiceModel, object serviceModel, IServiceImplementation serviceImplementation);

        /// <summary>
        /// update instance metadata
        /// </summary>
        Task<Instance> UpdateInstance(object dataToSerialize, string app, string org, int instanceOwnerId, Guid instanceId);

        /// <summary>
        /// update instance metadata
        /// </summary>
        Task<Instance> ArchiveInstance<T>(T dataToSerialize, Type type, string app, string org, int instanceOwnerId, Guid instanceId);

        /// <summary>
        /// Creates an instance of an application with no data.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceTemplate">the instance template to create (must have instanceOwnerId or instanceOwnerLookup set)</param>
        /// <returns>The created instance</returns>
        Task<Instance> CreateInstance(string org, string app, Instance instanceTemplate);
    }
}

using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for instance testing in altinn studio
    /// </summary>
    public interface IInstanceLocalDev
    {
        /// <summary>
        /// Instantiates a new instance
        /// </summary>
        Guid InstantiateInstance(string app, string org, int instanceOwnerId);

        /// <summary>
        /// Gets the instance
        /// </summary>
        Task<Instance> GetInstance(string app, string org, int instanceOwnerId, Guid instanceId);

        /// <summary>
        /// Saves the instance meta data
        /// </summary>
        void SaveInstance<T>(T dataToSerialize, string app, string org, int instanceOwnerId, Guid instanceId);
    }
}

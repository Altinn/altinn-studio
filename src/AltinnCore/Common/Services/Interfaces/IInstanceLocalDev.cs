using System;
using System.Threading.Tasks;
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
        Guid InstantiateInstance(string applicationId, string applicationOwnerId, int instanceOwnerId);

        /// <summary>
        /// Gets the instance
        /// </summary>
        Task<Instance> GetInstance(string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId);

        /// <summary>
        /// Saves the instance meta data
        /// </summary>
        void SaveInstance<T>(T dataToSerialize, string applicationId, string applicationOwnerId, int instanceOwnerId, Guid instanceId);
    }
}

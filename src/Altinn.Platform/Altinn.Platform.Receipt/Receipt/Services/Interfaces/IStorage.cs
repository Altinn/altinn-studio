using System;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Receipt.Services.Interfaces
{
    /// <summary>
    /// Interface for the Altinn Platform Storage services
    /// </summary>
    public interface IStorage
    {
        /// <summary>
        /// Gets an instances based onthe properties of the instanceId
        /// </summary>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">Unique id to identify the instance</param>
        /// <returns></returns>
        public Task<Instance> GetInstance(int instanceOwnerId, Guid instanceGuid);
    }
}

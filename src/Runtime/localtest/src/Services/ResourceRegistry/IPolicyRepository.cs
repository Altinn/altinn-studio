using System;
using System.IO;
using System.Threading.Tasks;

namespace Altinn.ResourceRegistry.Core
{
    /// <summary>
    /// Interface for operations on policy files.
    /// </summary>
    public interface IPolicyRepository
    {
        /// <summary>
        /// Gets file stream for the policy file from blob storage, if it exists at the specified path.
        /// </summary>
        /// <param name="resourceId">The resource id</param>
        /// <returns>File stream of the policy file</returns>
        Task<Stream> GetPolicyAsync(string resourceId);

        /// <summary>
        /// Gets file stream for the specified version of a policy file from blob storage, if it exists at the specified path.
        /// </summary>
        /// <param name="resourceId">The resource id</param>
        /// <param name="version">The blob storage version</param>
        /// <returns>File stream of the policy file</returns>
        Task<Stream> GetPolicyVersionAsync(string resourceId, string version);

        /// <summary>
        /// Tries to acquire a blob lease on the base blob for the provided filepath.
        /// </summary>
        /// <param name="resourceId">The resourceId</param> 
        /// <returns>The LeaseId if a release was possible, otherwise null</returns>
        Task<string> TryAcquireBlobLease(string resourceId);

        /// <summary>
        /// Releases a blob lease on the base blob for the resource policy for the provided resource id using the provided leaseId.
        /// </summary>
        /// <param name="resourceId">The resourceId</param> 
        /// <param name="leaseId">The lease id from to release</param>
        void ReleaseBlobLease(string resourceId, string leaseId);

        /// <summary>
        /// Checks whether there exists a blob for the specific resource
        /// </summary>
        /// <param name="resourceId">The resourceId</param> 
        /// <returns>Bool whether the blob exists or not</returns>
        Task<bool> PolicyExistsAsync(string resourceId);
    }
}

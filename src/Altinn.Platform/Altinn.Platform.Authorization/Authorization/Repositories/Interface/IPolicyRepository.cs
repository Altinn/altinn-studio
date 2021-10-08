using System;
using System.IO;
using System.Threading.Tasks;
using Azure;
using Azure.Storage.Blobs.Models;

namespace Altinn.Platform.Authorization.Repositories.Interface
{
    /// <summary>
    /// Interface for operations on policy files.
    /// </summary>
    public interface IPolicyRepository
    {
        /// <summary>
        /// Gets file stream for the policy file from blob storage, if it exists at the specified path.
        /// </summary>
        /// <param name="filepath">The file path.</param>
        /// <returns>File stream of the policy file</returns>
        Task<Stream> GetPolicyAsync(string filepath);

        /// <summary>
        /// Gets file stream for the specified version of a policy file from blob storage, if it exists at the specified path.
        /// </summary>
        /// <param name="filepath">The file path.</param>
        /// <param name="version">The blob storage version</param>
        /// <returns>File stream of the policy file</returns>
        Task<Stream> GetPolicyVersionAsync(string filepath, string version);

        /// <summary>
        /// Writes a file stream to blobstorage to the specified path.
        /// </summary>
        /// <param name="filepath">The file path.</param> 
        /// <param name="fileStream">File stream of the policy file to be written</param>
        /// <returns>Azure response BlobContentInfo</returns>
        Task<Response<BlobContentInfo>> WritePolicyAsync(string filepath, Stream fileStream);

        /// <summary>
        /// Writes a file stream to blobstorage to the specified path, including the conditional check that the provided blob lease id is valid.
        /// </summary>
        /// <param name="filepath">The file path.</param> 
        /// <param name="fileStream">File stream of the policy file to be written</param>
        /// <param name="blobLeaseId">The blob lease id, required to be able to write after a lock</param>
        /// <returns>Azure response BlobContentInfo</returns>
        Task<Response<BlobContentInfo>> WritePolicyConditionallyAsync(string filepath, Stream fileStream, string blobLeaseId);

        /// <summary>
        /// Deletes a specific version of a blob storage file if it exits on the specified path.
        /// </summary>
        /// <param name="filepath">The file path.</param>
        /// <param name="version">The blob storage version</param>
        /// <returns></returns>
        Task<Response> DeletePolicyVersionAsync(string filepath, string version);

        /// <summary>
        /// Tries to acquire a blob lease on the base blob for the provided filepath.
        /// </summary>
        /// <param name="filepath">The file path of the base blob to aquire a blob lease on</param>
        /// <returns>The LeaseId if a release was possible, otherwise null</returns>
        Task<string> TryAcquireBlobLease(string filepath);

        /// <summary>
        /// Releases a blob lease on the base blob for the provided filepath using the provided leaseId.
        /// </summary>
        /// <param name="filepath">The file path of the base blob to release</param>
        /// <param name="leaseId">The lease id from to release</param>
        void ReleaseBlobLease(string filepath, string leaseId);

        /// <summary>
        /// Checks whether there exists a blob at the specified path
        /// </summary>
        /// <param name="filepath">The file path to check if a blob exists/param>
        /// <returns>Bool whether the blob exists or not</returns>
        Task<bool> PolicyExistsAsync(string filepath);
    }
}

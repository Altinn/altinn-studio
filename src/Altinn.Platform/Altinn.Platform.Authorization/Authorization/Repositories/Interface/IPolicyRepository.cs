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
        /// Gets file stream for the policy file and the curent ETag of the blob from blob storage, if it exists at the specified path.
        /// </summary>
        /// <param name="filepath">The file path.</param>
        /// <param name="version">The blob storage version</param>
        /// <returns>Tuple consisting of the file stream of the policy file, and the current ETag of the blob entity wthat was read</returns>
        Task<Tuple<Stream, ETag>> GetPolicyAndETagByVersionAsync(string filepath, string version);

        /// <summary>
        /// Writes a file stream to blobstorage to the specified path.
        /// </summary>
        /// <param name="filepath">The file path.</param> 
        /// <param name="fileStream">File stream of the policy file to be written</param>
        /// <returns>Azure response BlobContentInfo</returns>
        Task<Response<BlobContentInfo>> WritePolicyAsync(string filepath, Stream fileStream);

        /// <summary>
        /// Writes a file stream to blobstorage to the specified path, including the conditional check that the current ETag of the blob is unchanged from the specified originalETag param.
        /// </summary>
        /// <param name="filepath">The file path.</param> 
        /// <param name="fileStream">File stream of the policy file to be written</param>
        /// <param name="originalETag">The original ETag for the policy in blob storage, for verification that the blob has not changed since it was originally read</param>
        /// <returns>Azure response BlobContentInfo</returns>
        Task<Response<BlobContentInfo>> WritePolicyConditionallyAsync(string filepath, Stream fileStream, ETag originalETag);

        /// <summary>
        /// Deletes a specific version of a blob storage file if it exits on the specified path.
        /// </summary>
        /// <param name="filepath">The file path.</param>
        /// <param name="version">The blob storage version</param>
        /// <returns></returns>
        Task<Response> DeletePolicyVersionAsync(string filepath, string version);
    }
}

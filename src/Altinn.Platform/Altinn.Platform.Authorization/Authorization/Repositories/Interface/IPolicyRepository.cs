using System.IO;
using System.Threading.Tasks;
using Azure.Storage.Blobs.Models;

namespace Altinn.Platform.Authorization.Repositories.Interface
{
    /// <summary>
    /// Interface for operations on policy files.
    /// </summary>
    public interface IPolicyRepository
    {
        /// <summary>
        /// Gets an authorization rule set from blob storage.
        /// </summary>
        /// <param name="filepath">The file path. </param> 
        /// <returns>File stream containing the rule set</returns>
        Task<Stream> GetPolicyAsync(string filepath);

        /// <summary>
        /// Writes an authorization rule set to blob storage.
        /// </summary>
        /// <param name="filepath">The file path. </param> 
        /// <param name="fileStream">data to be written to the rule file</param>
        /// <returns>Azure response BlobContentInfo</returns>
        Task<Azure.Response<BlobContentInfo>> WritePolicyAsync(string filepath, Stream fileStream);
    }
}

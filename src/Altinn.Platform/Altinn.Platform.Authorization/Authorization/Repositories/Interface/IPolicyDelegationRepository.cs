using System.IO;
using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.Repositories.Interface
{
    /// <summary>
    /// Interface for repository operations on delegations.
    /// </summary>
    public interface IPolicyDelegationRepository
    {
        /// <summary>
        /// Gets an authorization rule set representing a delegation from blob storage.
        /// </summary>
        /// <param name="filepath">The file path. </param> 
        /// <returns>File stream containing the rule set</returns>
        Task<Stream> GetDelegationPolicyAsync(string filepath);

        /// <summary>
        /// Writes an authorization rule set representing a delegation to blob storage.
        /// </summary>
        /// <param name="filepath">The file path. </param> 
        /// <param name="fileStream">data to be written to the rule file</param>
        /// <returns>Returns a bool based on writing file to storage was successful</returns>
        Task<bool> WriteDelegationPolicyAsync(string filepath, Stream fileStream);

        /// <summary>
        /// Writes the delegation meta data to the delegation database
        /// </summary>
        /// <returns>Returns a bool if inserted ok</returns>
        Task<bool> InsertDelegation();
    }
}

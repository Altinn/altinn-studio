using System.IO;
using System.Threading.Tasks;

namespace Altinn.Platform.Authorization.Repositories.Interface
{
    /// <summary>
    /// Interface for operations on authorization rules.
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
        /// <returns>Returns a bool based on writing file to storage was successful</returns>
        Task<bool> WritePolicyAsync(string filepath, Stream fileStream);
    }
}

using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Models;

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
        /// <param name="altinnAppId">The AltinnApp identifier iin the format org/appname</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party id of the entity having received the delegated policy, if the entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the entity is a user</param>
        /// <param name="delegatedByUserId">The user id of the entity performing the delegation of the policy</param>
        /// <param name="blobStoragePolicyPath">The path to the blobstorage location of the policy file</param>
        /// <param name="blobStorageVersionId">The current blobstorage version</param>
        /// <returns>A bool value representing the whether the result of the asynchronous operation was successful</returns>
        Task<bool> InsertDelegation(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId, int delegatedByUserId, string blobStoragePolicyPath, string blobStorageVersionId);

        /// <summary>
        /// Gets the latest delegation change
        /// </summary>
        /// <param name="altinnAppId">The AltinnApp identifier iin the format org/appname</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party id of the entity having received the delegated policy, if the entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the entity is a user</param>
        /// <returns>A <see cref="Task{DelegatedPolicy}"/> representing the result of the asynchronous operation.</returns>
        Task<DelegatedPolicy> GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId);

        /// <summary>
        /// Gets the latest delegation change
        /// </summary>
        /// <param name="altinnAppId">The AltinnApp identifier iin the format org/appname</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party id of the entity having received the delegated policy, if the entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the entity is a user</param>
        /// <returns>A <see cref="Task{DelegatedPolicy}"/> representing the result of the asynchronous operation.</returns>
        Task<List<DelegatedPolicy>> GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId);
    }
}

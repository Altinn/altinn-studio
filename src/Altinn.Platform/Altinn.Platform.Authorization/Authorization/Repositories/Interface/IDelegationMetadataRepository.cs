using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Models;

namespace Altinn.Platform.Authorization.Repositories.Interface
{
    /// <summary>
    /// Interface for PostgreSQL operations on delegations.
    /// </summary>
    public interface IDelegationMetadataRepository
    {
        /// <summary>
        /// Writes the delegation metadata to the delegation database
        /// </summary>
        /// <param name="altinnAppId">The AltinnApp identifier iin the format org/appname</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party id of the entity having received the delegated policy, if the entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the entity is a user</param>
        /// <param name="delegatedByUserId">The user id of the entity performing the delegation of the policy</param>
        /// <param name="blobStoragePolicyPath">The path to the blobstorage location of the policy file</param>
        /// <param name="blobStorageVersionId">The current blobstorage version</param>
        /// <param name="isDeleted">Whether the delegation change is a (soft) deletion of the delegation policy</param>
        /// <returns>A bool value representing the whether the result of the asynchronous operation was successful</returns>
        Task<bool> InsertDelegation(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, int delegatedByUserId, string blobStoragePolicyPath, string blobStorageVersionId, bool isDeleted = false);

        /// <summary>
        /// Gets the latest delegation change matching the filter values
        /// </summary>
        /// <param name="altinnAppId">The AltinnApp identifier iin the format org/appname</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party id of the entity having received the delegated policy, if the entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the entity is a user</param>
        Task<DelegationChange> GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId);

        /// <summary>
        /// Gets all the delegation change records matching the filter values for a complete changelog
        /// </summary>
        /// <param name="altinnAppId">The AltinnApp identifier iin the format org/appname</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party id of the entity having received the delegated policy, if the entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the entity is a user</param>
        Task<List<DelegationChange>> GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId);

        /// <summary>
        /// Gets all the latest delegation changes
        /// </summary>
        /// <param name="altinnAppIds">The list of AltinnApp identifier in the format org/appname</param>
        /// <param name="offeredByPartyIds">The list of party ids of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyIds">The list of party ids of the entity having received the delegated policy, if the entity is an organization</param>
        /// <param name="coveredByUserIds">The list of user ids of the entity having received the delegated policy, if the entity is a user</param>
        Task<List<DelegationChange>> GetAllCurrentDelegationChanges(List<string> altinnAppIds, List<int> offeredByPartyIds, List<int> coveredByPartyIds, List<int> coveredByUserIds);
    }
}

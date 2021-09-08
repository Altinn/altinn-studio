using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Platform.Authorization.Models;

namespace Altinn.Platform.Authorization.Repositories.Interface
{
    /// <summary>
    /// Interface for PostgreSQL operations on delegations.
    /// </summary>
    public interface IPolicyDelegationRepository
    {
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
        Task<bool> InsertDelegation(string altinnAppId, int offeredByPartyId, int? coveredByPartyId, int? coveredByUserId, int delegatedByUserId, string blobStoragePolicyPath, string blobStorageVersionId);

        /// <summary>
        /// Gets the latest delegation change
        /// </summary>
        /// <param name="altinnAppId">The AltinnApp identifier iin the format org/appname</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party id of the entity having received the delegated policy, if the entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the entity is a user</param>
        void GetCurrentDelegationChange(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId);

        /// <summary>
        /// Gets the latest delegation change
        /// </summary>
        /// <param name="altinnAppId">The AltinnApp identifier iin the format org/appname</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party id of the entity having received the delegated policy, if the entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the entity is a user</param>
        void GetAllDelegationChanges(string altinnAppId, int offeredByPartyId, int coveredByPartyId, int coveredByUserId);
    }
}

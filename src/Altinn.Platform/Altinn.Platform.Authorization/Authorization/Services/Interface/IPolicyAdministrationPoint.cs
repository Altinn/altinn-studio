using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Models;

namespace Altinn.Platform.Authorization.Services.Interface
{
    /// <summary>
    /// Defines the interface for the Policy Administration Point
    /// </summary>
    public interface IPolicyAdministrationPoint
    {
        /// <summary>
        /// Returns a bool based on writing file to storage was successful
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileStream">A stream containing the content of the policy file</param>
        /// <returns></returns>
        Task<bool> WritePolicyAsync(string org, string app, Stream fileStream);

        /// <summary>
        /// Returns a delegated policy based the org, app, offering and receiving party ids
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredByPartyId">The party id of the entity having received the delegated policy, if the entity is an organization</param>
        /// <param name="coveredByUserId">The user id of the entity having received the delegated policy, if the entity is a user</param>
        /// <returns></returns>
        Task<DelegatedPolicy> GetDelegationPolicy(string org, string app, int offeredByPartyId, int coveredByPartyId, int coveredByUserId);

        /// <summary>
        /// Returns a bool based on writing file to storage was successful
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="offeredByPartyId">The party id of the entity offering the delegated the policy</param>
        /// <param name="coveredBy">The party or user id of the entity having received the delegated policy</param>
        /// <param name="delegatedByUserId">The user id of the entity performing the delegation of the policy</param>
        /// <param name="rules">The set of rules to be delegated</param>
        /// <returns></returns>
        Task<bool> WriteDelegationPolicy(string org, string app, int offeredByPartyId, string coveredBy, int delegatedByUserId, IList<Rule> rules);
    }
}

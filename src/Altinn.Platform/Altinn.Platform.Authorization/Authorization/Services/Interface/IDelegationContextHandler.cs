using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Models;

namespace Altinn.Authorization.ABAC.Interface
{
    /// <summary>
    /// Defines Interface for the Delegation Context Handler.
    /// </summary>
    public interface IDelegationContextHandler : IContextHandler
    {
        /// <summary>
        /// Updates needed subject information for the Context Request for a specific delegation
        /// </summary>
        /// <param name="request">The original Xacml Context Request</param>
        /// <param name="subjects">The list of PartyIds to be added as subject attributes</param>
        public void Enrich(XacmlContextRequest request, List<int> subjects);

        /// <summary>
        /// Gets the user id from the XacmlContextRequest subject attribute
        /// </summary>
        /// <param name="request">The Xacml Context Request</param>
        /// <returns>The user id of the subject</returns>
        public int GetSubjectUserId(XacmlContextRequest request);

        /// <summary>
        /// Gets a XacmlResourceAttributes model from the XacmlContextRequest
        /// </summary>
        /// <param name="request">The Xacml Context Request</param>
        /// <returns>XacmlResourceAttributes model</returns>
        public XacmlResourceAttributes GetResourceAttributes(XacmlContextRequest request);

        /// <summary>
        /// Gets the list of mainunits for a subunit
        /// </summary>
        /// <param name="subUnitPartyId">The subunit partyId to check and retrieve mainunits for</param>
        /// <returns>List of mainunits</returns>
        public Task<List<MainUnit>> GetMainUnits(int subUnitPartyId);

        /// <summary>
        /// Gets the list of keyrole unit partyIds for a user
        /// </summary>
        /// <param name="subjectUserId">The userid to retrieve keyrole unit for</param>
        /// <returns>List of partyIds for units where user has keyrole</returns>
        public Task<List<int>> GetKeyRolePartyIds(int subjectUserId);
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Configuration;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;
using Authorization.Platform.Authorization.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The delegationg context handler is responsible for updating a context request based on information from informationpoint for a specific delegation.
    /// In order for the context request to be passed to decision point to be checked for authorization against the delegation policy
    /// </summary>
    public class DelegationContextHandler : ContextHandler, IDelegationContextHandler
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="DelegationContextHandler"/> class
        /// </summary>
        /// <param name="policyInformationRepository">the policy information repository handler</param>
        /// <param name="rolesWrapper">the roles handler</param>
        /// <param name="memoryCache">The cache handler </param>
        /// <param name="settings">The app settings</param>
        public DelegationContextHandler(IInstanceMetadataRepository policyInformationRepository, IRoles rolesWrapper, IMemoryCache memoryCache, IOptions<GeneralSettings> settings)
            : base(policyInformationRepository, rolesWrapper, memoryCache, settings)
        {
        }

        /// <summary>
        /// Updates needed subject information for the Context Request for a specific delegation
        /// </summary>
        /// <param name="request">The original Xacml Context Request</param>
        /// <param name="subjects">The list of PartyIds to be added as subject attributes</param>
        public void Enrich(XacmlContextRequest request, List<int> subjects)
        {
            if (subjects?.Count == 0)
            {
                return;
            }

            XacmlContextAttributes subjectContextAttributes = request.GetSubjectAttributes();
            subjectContextAttributes.Attributes.Add(GetPartyIdsAttribute(subjects));
        }

        /// <summary>
        /// Gets the user id from the XacmlContextRequest subject attribute
        /// </summary>
        /// <param name="request">The Xacml Context Request</param>
        /// <returns>The user id of the subject</returns>
        public int GetSubjectUserId(XacmlContextRequest request)
        {
            XacmlContextAttributes subjectContextAttributes = request.GetSubjectAttributes();
            XacmlAttribute subjectAttribute = subjectContextAttributes.Attributes.FirstOrDefault(a => a.AttributeId.OriginalString.Equals(XacmlRequestAttribute.UserAttribute));
            return Convert.ToInt32(subjectAttribute?.AttributeValues.FirstOrDefault()?.Value);
        }

        /// <summary>
        /// Gets a XacmlResourceAttributes model from the XacmlContextRequest
        /// </summary>
        /// <param name="request">The Xacml Context Request</param>
        /// <returns>XacmlResourceAttributes model</returns>
        public XacmlResourceAttributes GetResourceAttributes(XacmlContextRequest request)
        {
            XacmlContextAttributes resourceContextAttributes = request.GetResourceAttributes();
            return GetResourceAttributeValues(resourceContextAttributes);
        }
    }
}

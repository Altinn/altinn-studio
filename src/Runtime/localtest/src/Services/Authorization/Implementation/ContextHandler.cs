using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Models;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Authorization.Interface.Models;
using LocalTest.Services.Authorization.Interface;
using LocalTest.Services.Profile.Interface;

namespace Altinn.Platform.Authorization.Services.Implementation
{
    /// <summary>
    /// The context handler is responsible for updating a context request
    /// From XACML standard
    ///
    /// Context Handler
    /// The system entity that converts decision requests in the native request format to the XACML canonical form, coordinates with Policy
    /// Information Points to add attribute values to the request context, and converts authorization decisions in the XACML canonical form to
    /// the native response format
    /// </summary>
    public class ContextHandler : IContextHandler
    {
        private readonly IPolicyInformationRepository _policyInformationRepository;
        private readonly IRoles _rolesWrapper;
        private readonly IUserProfiles _profilesWrapper;
        private readonly LocalTest.Services.Register.Interface.IParties _partiesWrapper;
        protected readonly IPolicyRetrievalPoint _prp;

        /// <summary>
        /// Initializes a new instance of the <see cref="ContextHandler"/> class
        /// </summary>
        /// <param name="policyInformationRepository">the policy information repository handler</param>
        /// <param name="rolesWrapper">the roles handler</param>
        public ContextHandler(
            IPolicyInformationRepository policyInformationRepository, 
            IRoles rolesWrapper,
            IUserProfiles profilesWrapper,
            LocalTest.Services.Register.Interface.IParties partiesWrapper,
            IPolicyRetrievalPoint prp
        )
        {
            _policyInformationRepository = policyInformationRepository;
            _rolesWrapper = rolesWrapper;
            _profilesWrapper = profilesWrapper;
            _partiesWrapper = partiesWrapper;
            _prp = prp;
        }

        /// <summary>
        /// Ads needed information to the Context Request.
        /// </summary>
        /// <param name="request">The original Xacml Context Request</param>
        /// <returns></returns>
        public async Task<XacmlContextRequest> Enrich(XacmlContextRequest request)
        {
            await EnrichResourceAttributes(request);
            return await Task.FromResult(request);
        }

        private async Task EnrichResourceAttributes(XacmlContextRequest request)
        {
            XacmlContextAttributes resourceContextAttributes = request.GetResourceAttributes();
            XacmlResourceAttributes resourceAttributes = GetResourceAttributeValues(resourceContextAttributes);
            await EnrichResourceParty(resourceContextAttributes, resourceAttributes);

            bool resourceAttributeComplete = IsResourceComplete(resourceAttributes);

            if (!resourceAttributeComplete && !string.IsNullOrEmpty(resourceAttributes.InstanceValue))
            {
                Instance instanceData = await _policyInformationRepository.GetInstance(resourceAttributes.InstanceValue);
                if (instanceData != null)
                {
                    AddIfValueDoesNotExist(resourceContextAttributes, XacmlRequestAttribute.OrgAttribute, resourceAttributes.OrgValue, instanceData.Org);
                    string app = instanceData.AppId.Split("/")[1];
                    AddIfValueDoesNotExist(resourceContextAttributes, XacmlRequestAttribute.AppAttribute, resourceAttributes.AppValue, app);
                    if (instanceData.Process?.CurrentTask != null)
                    {
                        AddIfValueDoesNotExist(resourceContextAttributes, XacmlRequestAttribute.TaskAttribute, resourceAttributes.TaskValue, instanceData.Process.CurrentTask.ElementId);
                    }
                    else if (instanceData.Process?.EndEvent != null)
                    {
                        AddIfValueDoesNotExist(resourceContextAttributes, XacmlRequestAttribute.EndEventAttribute, null, instanceData.Process.EndEvent);
                    }

                    AddIfValueDoesNotExist(resourceContextAttributes, XacmlRequestAttribute.PartyAttribute, resourceAttributes.ResourcePartyValue, instanceData.InstanceOwner.PartyId);
                    resourceAttributes.ResourcePartyValue = instanceData.InstanceOwner.PartyId;
                }
            }

            await EnrichSubjectAttributes(request, resourceAttributes.ResourcePartyValue);
        }

        
        protected async Task EnrichResourceParty(XacmlContextAttributes requestResourceAttributes, XacmlResourceAttributes resourceAttributes)
        {
            if (string.IsNullOrEmpty(resourceAttributes.ResourcePartyValue) && !string.IsNullOrEmpty(resourceAttributes.OrganizationNumber))
            {
                Party party = await _partiesWrapper.LookupPartyBySSNOrOrgNo(resourceAttributes.OrganizationNumber);
                if (party != null)
                {
                    resourceAttributes.ResourcePartyValue = party.PartyId.ToString();
                    requestResourceAttributes.Attributes.Add(GetPartyIdsAttribute(new List<int> { party.PartyId }));
                }
            }
            else if (string.IsNullOrEmpty(resourceAttributes.ResourcePartyValue) && !string.IsNullOrEmpty(resourceAttributes.PersonId))
            {
                Party party = await _partiesWrapper.LookupPartyBySSNOrOrgNo(resourceAttributes.PersonId);
                if (party != null)
                {
                    resourceAttributes.ResourcePartyValue = party.PartyId.ToString();
                    requestResourceAttributes.Attributes.Add(GetPartyIdsAttribute(new List<int> { party.PartyId }));
                }
            }
        }


        private static bool IsResourceComplete(XacmlResourceAttributes resourceAttributes)
        {
            bool resourceAttributeComplete = false;
            if (!string.IsNullOrEmpty(resourceAttributes.OrgValue) &&
                !string.IsNullOrEmpty(resourceAttributes.AppValue) &&
                !string.IsNullOrEmpty(resourceAttributes.InstanceValue) &&
                !string.IsNullOrEmpty(resourceAttributes.ResourcePartyValue) &&
                !string.IsNullOrEmpty(resourceAttributes.TaskValue))
            {
                // The resource attributes are complete
                resourceAttributeComplete = true;
            }
            else if (!string.IsNullOrEmpty(resourceAttributes.OrgValue) &&
                !string.IsNullOrEmpty(resourceAttributes.AppValue) &&
                string.IsNullOrEmpty(resourceAttributes.InstanceValue) &&
                !string.IsNullOrEmpty(resourceAttributes.ResourcePartyValue) &&
                string.IsNullOrEmpty(resourceAttributes.TaskValue))
            {
                // The resource attributes are complete
                resourceAttributeComplete = true;
            }
            else if (!string.IsNullOrEmpty(resourceAttributes.OrgValue) &&
            !string.IsNullOrEmpty(resourceAttributes.AppValue) &&
            !string.IsNullOrEmpty(resourceAttributes.InstanceValue) &&
            !string.IsNullOrEmpty(resourceAttributes.ResourcePartyValue) &&
            !string.IsNullOrEmpty(resourceAttributes.AppResourceValue) &&
            resourceAttributes.AppResourceValue.Equals("events"))
            {
                // The resource attributes are complete
                resourceAttributeComplete = true;
            }
            else if (!string.IsNullOrEmpty(resourceAttributes.ResourceRegistryId) &&
           !string.IsNullOrEmpty(resourceAttributes.ResourcePartyValue))
            {
                // The resource attributes are complete
                resourceAttributeComplete = true;
            }

            return resourceAttributeComplete;
        }

        protected XacmlResourceAttributes GetResourceAttributeValues(XacmlContextAttributes resourceContextAttributes)
        {
            XacmlResourceAttributes resourceAttributes = new XacmlResourceAttributes();

            foreach (XacmlAttribute attribute in resourceContextAttributes.Attributes)
            {
                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.OrgAttribute))
                {
                    resourceAttributes.OrgValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.AppAttribute))
                {
                    resourceAttributes.AppValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.InstanceAttribute))
                {
                    resourceAttributes.InstanceValue = attribute.AttributeValues.First().Value;
                    string[] instanceValues = resourceAttributes.InstanceValue.Split('/');
                    resourceAttributes.ResourceInstanceValue = instanceValues[1];
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.ResourceRegistryInstanceAttribute))
                {
                    resourceAttributes.ResourceInstanceValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.PartyAttribute))
                {
                    resourceAttributes.ResourcePartyValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.TaskAttribute))
                {
                    resourceAttributes.TaskValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.AppResourceAttribute))
                {
                    resourceAttributes.AppResourceValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.ResourceRegistryAttribute))
                {
                    string resourceValue = attribute.AttributeValues.First().Value;
                    if (resourceValue.StartsWith("app_"))
                    {
                        string[] orgAppValues = resourceValue.Split('_');
                        resourceAttributes.OrgValue = orgAppValues[1];
                        resourceAttributes.AppValue = orgAppValues[2];
                    }
                    else
                    {
                        resourceAttributes.ResourceRegistryId = resourceValue;
                    }
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.OrganizationNumberAttribute))
                {
                    resourceAttributes.OrganizationNumber = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.LegacyOrganizationNumberAttribute))
                {
                    // For supporting legacy use of this attribute. (old PEPS)
                    if (string.IsNullOrEmpty(resourceAttributes.OrganizationNumber))
                    { 
                        resourceAttributes.OrganizationNumber = attribute.AttributeValues.First().Value;
                    }
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.PersonIdAttribute))
                {
                    resourceAttributes.PersonId = attribute.AttributeValues.First().Value;
                }
            }

            return resourceAttributes;
        }

        private static void AddIfValueDoesNotExist(XacmlContextAttributes resourceAttributes, string attributeId, string attributeValue, string newAttributeValue)
        {
            if (string.IsNullOrEmpty(attributeValue))
            {
                resourceAttributes.Attributes.Add(GetAttribute(attributeId, newAttributeValue));
            }
        }

        private static XacmlAttribute GetAttribute(string attributeId, string attributeValue)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(attributeId), false);
            if (attributeId.Equals(XacmlRequestAttribute.PartyAttribute))
            {
                // When Party attribute is missing from input it is good to return it so PEP can get this information
                attribute.IncludeInResult = true;
            }

            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), attributeValue));
            return attribute;
        }

        private async Task EnrichSubjectAttributes(XacmlContextRequest request, string resourceParty)
        {
            // If there is no resource party then it is impossible to enrich roles
            if (string.IsNullOrEmpty(resourceParty))
            {
                return;
            }

            XacmlContextAttributes subjectContextAttributes = request.GetSubjectAttributes();

            int subjectUserId = 0;
            int resourcePartyId = Convert.ToInt32(resourceParty);
            string subjectSsn = string.Empty;
            string subjectOrgnNo = string.Empty;
            bool foundLegacyOrgNoAttribute = false;

            if (subjectContextAttributes.Attributes.Any(a => a.AttributeId.OriginalString.Equals(XacmlRequestAttribute.SystemUserIdAttribute)) && subjectContextAttributes.Attributes.Count > 1)
            {
                throw new ArgumentException($"Subject attribute {XacmlRequestAttribute.SystemUserIdAttribute} can only be used by itself and not in combination with other subject identifiers.");
            }

            foreach (XacmlAttribute xacmlAttribute in subjectContextAttributes.Attributes)
            {
                if (xacmlAttribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.UserAttribute))
                {
                    subjectUserId = Convert.ToInt32(xacmlAttribute.AttributeValues.First().Value);
                }

                if (xacmlAttribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.PersonIdAttribute))
                {
                    subjectSsn = xacmlAttribute.AttributeValues.First().Value;
                }

                if (xacmlAttribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.LegacyOrganizationNumberAttribute))
                {
                    foundLegacyOrgNoAttribute = true;
                    subjectOrgnNo = xacmlAttribute.AttributeValues.First().Value;
                }

                if (xacmlAttribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.OrganizationNumberAttribute))
                {
                    subjectOrgnNo = xacmlAttribute.AttributeValues.First().Value;
                }
            }

            if (foundLegacyOrgNoAttribute)
            {
                subjectContextAttributes.Attributes.Add(GetOrganizationIdentifierAttribute(subjectOrgnNo));
            }

            if (!string.IsNullOrEmpty(subjectSsn) && subjectUserId != 0)
            {
                throw new ArgumentException("Not allowed to set userid and person-id for subject at the same time");
            }

            if (!string.IsNullOrEmpty(subjectOrgnNo) && (subjectUserId != 0 || !string.IsNullOrEmpty(subjectSsn)))
            {
                throw new ArgumentException("Not allowed to set organization number and person-id or userid for subject at the same time");
            }

            if (!string.IsNullOrEmpty(subjectSsn))
            {
                UserProfile subjectProfile = await _profilesWrapper.GetUserByPersonId(subjectSsn);
                if (subjectProfile != null)
                {
                    subjectUserId = subjectProfile.UserId;
                    subjectContextAttributes.Attributes.Add(GetUserIdAttribute(subjectUserId));
                }
                else
                {
                    throw new ArgumentException("Invalid person-id");
                }
            }

            if (!string.IsNullOrEmpty(subjectOrgnNo))
            {
                Party party = await _partiesWrapper.LookupPartyBySSNOrOrgNo(subjectOrgnNo);
                if (party is not null)
                {
                    subjectContextAttributes.Attributes.Add(GetPartyIdsAttribute(new List<int> { party.PartyId }));
                }
            }

            // No need for further enrichment of roles of no user subject exists
            if (subjectUserId == 0)
            {
                return;
            }

            XacmlPolicy xacmlPolicy = await _prp.GetPolicyAsync(request);
            if (xacmlPolicy == null)
            {
                return;
            }

            IDictionary<string, ICollection<string>> policySubjectAttributes = xacmlPolicy.GetAttributeDictionaryByCategory(XacmlConstants.MatchAttributeCategory.Subject);
            if (policySubjectAttributes.ContainsKey(AltinnXacmlConstants.MatchAttributeIdentifiers.OedRoleAttribute))
            {
                if (string.IsNullOrEmpty(subjectSsn))
                {
                    subjectSsn = (await _profilesWrapper.GetUser(subjectUserId)).Party.SSN;
                }
                
                string resourceSsn = (await _partiesWrapper.GetParty(resourcePartyId)).SSN;

                if (!string.IsNullOrWhiteSpace(subjectSsn) && !string.IsNullOrWhiteSpace(resourceSsn))
                {
                    // List<OedRoleAssignment> oedRoleAssignments = await GetOedRoleAssignments(resourceSsn, subjectSsn);
                    // if (oedRoleAssignments.Count != 0)
                    // {
                    //     subjectContextAttributes.Attributes.Add(GetOedRoleAttributes(oedRoleAssignments));
                    // }
                }
            }

            if (policySubjectAttributes.ContainsKey(AltinnXacmlConstants.MatchAttributeIdentifiers.RoleAttribute))
            {
                List<Role> roleList = await _rolesWrapper.GetDecisionPointRolesForUser(subjectUserId, resourcePartyId) ?? new List<Role>();
                if (roleList.Count != 0)
                {
                    subjectContextAttributes.Attributes.Add(GetRoleAttribute(roleList));
                }
            }
        }

        private static XacmlAttribute GetRoleAttribute(List<Role> roles)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(XacmlRequestAttribute.RoleAttribute), false);
            foreach (Role role in roles)
            {
                attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), role.Value));
            }

            return attribute;
        }

        protected XacmlAttribute GetOrganizationIdentifierAttribute(string orgNo)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(XacmlRequestAttribute.OrganizationNumberAttribute), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), orgNo));
            return attribute;
        }

        protected XacmlAttribute GetUserIdAttribute(int userId)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(XacmlRequestAttribute.UserAttribute), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), userId.ToString()));
            return attribute;
        }

        protected XacmlAttribute GetPartyIdsAttribute(List<int> partyIds)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(XacmlRequestAttribute.PartyAttribute), false);
            foreach (int partyId in partyIds)
            {
                attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), partyId.ToString()));
            }

            return attribute;
        }
    }
}

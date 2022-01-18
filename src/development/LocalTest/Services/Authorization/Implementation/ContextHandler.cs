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
using Altinn.Platform.Storage.Interface.Models;
using Authorization.Interface.Models;

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

        /// <summary>
        /// Initializes a new instance of the <see cref="ContextHandler"/> class
        /// </summary>
        /// <param name="policyInformationRepository">the policy information repository handler</param>
        /// <param name="rolesWrapper">the roles handler</param>
        public ContextHandler(
            IPolicyInformationRepository policyInformationRepository, IRoles rolesWrapper)
        {
            _policyInformationRepository = policyInformationRepository;
            _rolesWrapper = rolesWrapper;
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

                    AddIfValueDoesNotExist(resourceContextAttributes, XacmlRequestAttribute.PartyAttribute, resourceAttributes.ResourcePartyValue, instanceData.InstanceOwner.PartyId);
                    resourceAttributes.ResourcePartyValue = instanceData.InstanceOwner.PartyId;
                }
            }

            await EnrichSubjectAttributes(request, resourceAttributes.ResourcePartyValue);
        }

        private XacmlResourceAttributes GetResourceAttributeValues(XacmlContextAttributes resourceContextAttributes)
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
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.PartyAttribute))
                {
                    resourceAttributes.ResourcePartyValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.TaskAttribute))
                {
                    resourceAttributes.TaskValue = attribute.AttributeValues.First().Value;
                }
            }

            return resourceAttributes;
        }

        private void AddIfValueDoesNotExist(XacmlContextAttributes resourceAttributes, string attributeId, string attributeValue, string newAttributeValue)
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

            foreach (XacmlAttribute xacmlAttribute in subjectContextAttributes.Attributes)
            {
                if (xacmlAttribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.UserAttribute))
                {
                    subjectUserId = Convert.ToInt32(xacmlAttribute.AttributeValues.First().Value);
                }
            }

            if (subjectUserId == 0)
            {
                return;
            }

            List<Role> roleList = await _rolesWrapper.GetDecisionPointRolesForUser(subjectUserId, resourcePartyId) ?? new List<Role>();

            subjectContextAttributes.Attributes.Add(GetRoleAttribute(roleList));
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
    }
}

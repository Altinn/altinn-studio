using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Constants;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Storage.Models;
using Authorization.Interface.Models;
using Microsoft.Extensions.Options;

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
            string orgAttributeValue = string.Empty;
            string appAttributeValue = string.Empty;
            string instanceAttributeValue = string.Empty;
            string resourcePartyAttributeValue = string.Empty;
            string taskAttributeValue = string.Empty;
            string userAttributeValue = string.Empty;

            XacmlContextAttributes resourceContextAttributes = request.GetResourceAttributes();

            foreach (XacmlAttribute attribute in resourceContextAttributes.Attributes)
            {
                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.OrgAttribute))
                {
                    orgAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.AppAttribute))
                {
                    appAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.InstanceAttribute))
                {
                    instanceAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.PartyAttribute))
                {
                    resourcePartyAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.TaskAttribute))
                {
                    taskAttributeValue = attribute.AttributeValues.First().Value;
                }               
            }

            bool resourceAttributeComplete = false;

            if (!string.IsNullOrEmpty(orgAttributeValue) &&
                !string.IsNullOrEmpty(appAttributeValue) &&
                !string.IsNullOrEmpty(instanceAttributeValue) &&
                !string.IsNullOrEmpty(resourcePartyAttributeValue) &&
                !string.IsNullOrEmpty(taskAttributeValue))
            {
                // The resource attributes are complete
                resourceAttributeComplete = true;
            }
            else if (!string.IsNullOrEmpty(orgAttributeValue) &&
                !string.IsNullOrEmpty(appAttributeValue) &&
                string.IsNullOrEmpty(instanceAttributeValue) &&
                !string.IsNullOrEmpty(resourcePartyAttributeValue) &&
                string.IsNullOrEmpty(taskAttributeValue))
            {
                // The resource attributes are complete
                resourceAttributeComplete = true;
            }

            if (!resourceAttributeComplete)
            {
                if (!string.IsNullOrEmpty(instanceAttributeValue))
                {
                    Instance instanceData = await _policyInformationRepository.GetInstance(instanceAttributeValue);

                    if (string.IsNullOrEmpty(orgAttributeValue))
                    {
                        resourceContextAttributes.Attributes.Add(GetAttribute(XacmlRequestAttribute.OrgAttribute, instanceData.Org));
                    }

                    if (string.IsNullOrEmpty(appAttributeValue))
                    {
                        string app = instanceData.AppId.Split("/")[1];
                        resourceContextAttributes.Attributes.Add(GetAttribute(XacmlRequestAttribute.AppAttribute, app));
                    }

                    if (string.IsNullOrEmpty(taskAttributeValue))
                    {
                        resourceContextAttributes.Attributes.Add(GetAttribute(XacmlRequestAttribute.TaskAttribute, instanceData.Process.CurrentTask.ElementId));
                    }

                    if (string.IsNullOrEmpty(resourcePartyAttributeValue))
                    {
                        resourceContextAttributes.Attributes.Add(GetAttribute(XacmlRequestAttribute.PartyAttribute, instanceData.InstanceOwnerId));
                    }

                    resourcePartyAttributeValue = instanceData.InstanceOwnerId;
                }
            }

            await EnrichSubjectAttributes(request, resourcePartyAttributeValue);
        }

        private XacmlAttribute GetAttribute(string attributeId, string attributeValue)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(attributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), attributeValue));
            return attribute;
        }

        private async Task EnrichSubjectAttributes(XacmlContextRequest request, string resourceParty)
        {
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

            List<Role> roleList = await _rolesWrapper.GetDecisionPointRolesForUser(subjectUserId, resourcePartyId);

            subjectContextAttributes.Attributes.Add(GetRoleAttribute(roleList));
        }

        private XacmlAttribute GetRoleAttribute(List<Role> roles)
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

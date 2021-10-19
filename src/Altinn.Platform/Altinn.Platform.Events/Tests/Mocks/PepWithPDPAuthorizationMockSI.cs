using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Xml;

using Altinn.Authorization.ABAC;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;

using Altinn.Common.PEP.Constants;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Event.Tests.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.UnitTest.Constants;
using Authorization.Platform.Authorization.Models;
using Newtonsoft.Json;

namespace Altinn.Platform.Events.UnitTest.Mocks
{
    public class PepWithPDPAuthorizationMockSI : IPDP
    {
        private readonly string orgAttributeId = "urn:altinn:org";

        private readonly string appAttributeId = "urn:altinn:app";

        private readonly string userAttributeId = "urn:altinn:userid";

        private readonly string altinnRoleAttributeId = "urn:altinn:rolecode";

        public PepWithPDPAuthorizationMockSI()
        {
        }

        public async Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequestRoot xacmlJsonRequest)
        {
            return await Authorize(xacmlJsonRequest.Request);
        }

        private async Task<XacmlJsonResponse> Authorize(XacmlJsonRequest decisionRequest)
        {
            if (decisionRequest.MultiRequests == null || decisionRequest.MultiRequests.RequestReference == null
                || decisionRequest.MultiRequests.RequestReference.Count < 2)
            {
                XacmlContextRequest request = XacmlJsonXmlConverter.ConvertRequest(decisionRequest);
                XacmlContextResponse xmlResponse = await Authorize(request);
                return XacmlJsonXmlConverter.ConvertResponse(xmlResponse);
            }
            else
            {
                XacmlJsonResponse multiResponse = new XacmlJsonResponse();
                foreach (XacmlJsonRequestReference xacmlJsonRequestReference in decisionRequest.MultiRequests.RequestReference)
                {
                    XacmlJsonRequest jsonMultiRequestPart = new XacmlJsonRequest();

                    foreach (string refer in xacmlJsonRequestReference.ReferenceId)
                    {
                        List<XacmlJsonCategory> resourceCategoriesPart = decisionRequest.Resource.Where(i => i.Id.Equals(refer)).ToList();

                        if (resourceCategoriesPart.Count > 0)
                        {
                            if (jsonMultiRequestPart.Resource == null)
                            {
                                jsonMultiRequestPart.Resource = new List<XacmlJsonCategory>();
                            }

                            jsonMultiRequestPart.Resource.AddRange(resourceCategoriesPart);
                        }

                        List<XacmlJsonCategory> subjectCategoriesPart = decisionRequest.AccessSubject.Where(i => i.Id.Equals(refer)).ToList();

                        if (subjectCategoriesPart.Count > 0)
                        {
                            if (jsonMultiRequestPart.AccessSubject == null)
                            {
                                jsonMultiRequestPart.AccessSubject = new List<XacmlJsonCategory>();
                            }

                            jsonMultiRequestPart.AccessSubject.AddRange(subjectCategoriesPart);
                        }

                        List<XacmlJsonCategory> actionCategoriesPart = decisionRequest.Action.Where(i => i.Id.Equals(refer)).ToList();

                        if (actionCategoriesPart.Count > 0)
                        {
                            if (jsonMultiRequestPart.Action == null)
                            {
                                jsonMultiRequestPart.Action = new List<XacmlJsonCategory>();
                            }

                            jsonMultiRequestPart.Action.AddRange(actionCategoriesPart);
                        }
                    }

                    XacmlContextResponse partResponse = await Authorize(XacmlJsonXmlConverter.ConvertRequest(jsonMultiRequestPart));
                    XacmlJsonResponse xacmlJsonResponsePart = XacmlJsonXmlConverter.ConvertResponse(partResponse);

                    if (multiResponse.Response == null)
                    {
                        multiResponse.Response = new List<XacmlJsonResult>();
                    }

                    multiResponse.Response.Add(xacmlJsonResponsePart.Response.First());
                }

                return multiResponse;
            }
        }

        private async Task<XacmlContextResponse> Authorize(XacmlContextRequest decisionRequest)
        {
            decisionRequest = await Enrich(decisionRequest);

            XacmlPolicy policy = await GetPolicyAsync(decisionRequest);

            PolicyDecisionPoint pdp = new PolicyDecisionPoint();
            XacmlContextResponse xacmlContextResponse = pdp.Authorize(decisionRequest, policy);

            return xacmlContextResponse;
        }

        private string GetInstanceID(XacmlJsonRequestRoot xacmlJsonRequest)
        {
            string instanceId = string.Empty;
            foreach (XacmlJsonCategory category in xacmlJsonRequest.Request.Resource)
            {
                foreach (var atr in category.Attribute)
                {
                    if (atr.AttributeId.Equals(AltinnXacmlUrns.InstanceId))
                    {
                        instanceId = atr.Value;
                        break;
                    }
                }
            }

            return instanceId;
        }

        public async Task<bool> GetDecisionForUnvalidateRequest(XacmlJsonRequestRoot xacmlJsonRequest, ClaimsPrincipal user)
        {
            XacmlJsonResponse response = await GetDecisionForRequest(xacmlJsonRequest);
            return DecisionHelper.ValidatePdpDecision(response.Response, user);
        }

        public async Task<XacmlContextRequest> Enrich(XacmlContextRequest request)
        {
            await EnrichResourceAttributes(request);

            return request;
        }

        private async Task EnrichResourceAttributes(XacmlContextRequest request)
        {
            XacmlContextAttributes resourceContextAttributes = request.GetResourceAttributes();
            XacmlResourceAttributes resourceAttributes = GetResourceAttributeValues(resourceContextAttributes);

            await EnrichSubjectAttributes(request, resourceAttributes.ResourcePartyValue);
        }

        private void AddIfValueDoesNotExist(XacmlContextAttributes resourceAttributes, string attributeId, string attributeValue, string newAttributeValue)
        {
            if (string.IsNullOrEmpty(attributeValue))
            {
                resourceAttributes.Attributes.Add(GetAttribute(attributeId, newAttributeValue));
            }
        }

        private XacmlAttribute GetAttribute(string attributeId, string attributeValue)
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
                if (xacmlAttribute.AttributeId.OriginalString.Equals(userAttributeId))
                {
                    subjectUserId = Convert.ToInt32(xacmlAttribute.AttributeValues.First().Value);
                }
            }

            if (subjectUserId == 0)
            {
                return;
            }

            List<Role> roleList = await GetDecisionPointRolesForUser(subjectUserId, resourcePartyId) ?? new List<Role>();

            subjectContextAttributes.Attributes.Add(GetRoleAttribute(roleList));
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

                if (attribute.AttributeId.OriginalString.Equals(XacmlRequestAttribute.AppResourceAttribute))
                {
                    resourceAttributes.AppResourceValue = attribute.AttributeValues.First().Value;
                }
            }

            return resourceAttributes;
        }

        private XacmlAttribute GetRoleAttribute(List<Role> roles)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(altinnRoleAttributeId), false);
            foreach (Role role in roles)
            {
                attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), role.Value));
            }

            return attribute;
        }

        public Task<List<Role>> GetDecisionPointRolesForUser(int coveredByUserId, int offeredByPartyId)
        {
            string rolesPath = GetRolesPath(coveredByUserId, offeredByPartyId);

            List<Role> roles = new List<Role>();

            if (File.Exists(rolesPath))
            {
                string content = File.ReadAllText(rolesPath);
                roles = (List<Role>)JsonConvert.DeserializeObject(content, typeof(List<Role>));
            }

            return Task.FromResult(roles);
        }

        private string GetRolesPath(int userId, int resourcePartyId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PepWithPDPAuthorizationMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, @"../../../Data/Roles/User_" + userId + @"/party_" + resourcePartyId + @"/roles.json");
        }

        private async Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request)
        {
            XacmlPolicy xacmlPolicy = ParsePolicy("policy.xml", GetPolicyPath(request));
            return await Task.FromResult(xacmlPolicy);
        }

        private string GetPolicyPath(XacmlContextRequest request)
        {
            string org = string.Empty;
            string app = string.Empty;
            foreach (XacmlContextAttributes attr in request.Attributes)
            {
                if (attr.Category.OriginalString.Equals(XacmlConstants.MatchAttributeCategory.Resource))
                {
                    foreach (XacmlAttribute asd in attr.Attributes)
                    {
                        if (asd.AttributeId.OriginalString.Equals(orgAttributeId))
                        {
                            foreach (var asff in asd.AttributeValues)
                            {
                                org = asff.Value;
                                break;
                            }
                        }

                        if (asd.AttributeId.OriginalString.Equals(appAttributeId))
                        {
                            foreach (var asff in asd.AttributeValues)
                            {
                                app = asff.Value;
                                break;
                            }
                        }
                    }
                }
            }

            return GetAltinnAppsPolicyPath(org, app);
        }

        public static XacmlPolicy ParsePolicy(string policyDocumentTitle, string policyPath)
        {
            XmlDocument policyDocument = new XmlDocument();
            policyDocument.Load(Path.Combine(policyPath, policyDocumentTitle));
            XacmlPolicy policy;
            using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
            {
                policy = XacmlParser.ParseXacmlPolicy(reader);
            }

            return policy;
        }

        private string GetAltinnAppsPolicyPath(string org, string app)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PepWithPDPAuthorizationMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, "..", "..", "..", "Data", "apps", org, app, "config", "authorization");
        }
    }
}

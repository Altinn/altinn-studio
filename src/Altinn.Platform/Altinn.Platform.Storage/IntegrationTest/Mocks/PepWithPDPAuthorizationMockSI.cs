using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Configuration;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.IntegrationTest.Mocks.Authentication;
using Altinn.Platform.Storage.IntegrationTest.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

#pragma warning disable 1998
#pragma warning disable 1591
#pragma warning disable SA1600

namespace Altinn.Platform.Storage.IntegrationTest.Mocks
{
    public class PepWithPDPAuthorizationMockSI : IPDP
    {
        private readonly IInstanceRepository _instanceRepository;

        private readonly PepSettings _pepSettings;

        private readonly string orgAttributeId = "urn:altinn:org";

        private readonly string appAttributeId = "urn:altinn:app";

        private readonly string instanceAttributeId = "urn:altinn:instance-id";

        private readonly string taskAttributeId = "urn:altinn:task";

        private readonly string endEventAttributeId = "urn:altinn:end-event";

        private readonly string partyAttributeId = "urn:altinn:partyid";

        private readonly string userAttributeId = "urn:altinn:userid";

        private readonly string altinnRoleAttributeId = "urn:altinn:rolecode";

        public PepWithPDPAuthorizationMockSI(IInstanceRepository instanceRepository, IOptions<PepSettings> pepSettings)
        {
            this._instanceRepository = instanceRepository;
            _pepSettings = pepSettings.Value;
        }

        public async Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequestRoot xacmlJsonRequest)
        {
            string jsonResponse = string.Empty;

            if (xacmlJsonRequest.Request.MultiRequests != null)
            {
                try
                {
                    Altinn.Authorization.ABAC.PolicyDecisionPoint pdp = new Altinn.Authorization.ABAC.PolicyDecisionPoint();
                    XacmlJsonResponse multiResponse = new XacmlJsonResponse();
                    foreach (XacmlJsonRequestReference xacmlJsonRequestReference in xacmlJsonRequest.Request.MultiRequests.RequestReference)
                    {
                        XacmlJsonRequest jsonMultiRequestPart = new XacmlJsonRequest();

                        foreach (string refer in xacmlJsonRequestReference.ReferenceId)
                        {
                            IEnumerable<XacmlJsonCategory> resourceCategoriesPart = xacmlJsonRequest.Request.Resource.Where(i => i.Id.Equals(refer));

                            if (resourceCategoriesPart != null && resourceCategoriesPart.Count() > 0)
                            {
                                if (jsonMultiRequestPart.Resource == null)
                                {
                                    jsonMultiRequestPart.Resource = new List<XacmlJsonCategory>();
                                }

                                jsonMultiRequestPart.Resource.AddRange(resourceCategoriesPart);
                            }

                            IEnumerable<XacmlJsonCategory> subjectCategoriesPart = xacmlJsonRequest.Request.AccessSubject.Where(i => i.Id.Equals(refer));

                            if (subjectCategoriesPart != null && subjectCategoriesPart.Count() > 0)
                            {
                                if (jsonMultiRequestPart.AccessSubject == null)
                                {
                                    jsonMultiRequestPart.AccessSubject = new List<XacmlJsonCategory>();
                                }

                                jsonMultiRequestPart.AccessSubject.AddRange(subjectCategoriesPart);
                            }

                            IEnumerable<XacmlJsonCategory> actionCategoriesPart = xacmlJsonRequest.Request.Action.Where(i => i.Id.Equals(refer));

                            if (actionCategoriesPart != null && actionCategoriesPart.Count() > 0)
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
                catch
                {
                }
            }
            else if (xacmlJsonRequest.Request.AccessSubject[0].Attribute.Exists(a => (a.AttributeId == "urn:altinn:userid" && a.Value == "1")) ||
                xacmlJsonRequest.Request.AccessSubject[0].Attribute.Exists(a => a.AttributeId == "urn:altinn:org"))
            {
                jsonResponse = File.ReadAllText("data/response_permit.json");
            }
            else
            {
                jsonResponse = File.ReadAllText("data/response_deny.json");
            }

            XacmlJsonResponse response = JsonConvert.DeserializeObject<XacmlJsonResponse>(jsonResponse);

            return response;
        }

        public async Task<bool> GetDecisionForUnvalidateRequest(XacmlJsonRequestRoot xacmlJsonRequest, ClaimsPrincipal user)
        {
            if (_pepSettings.DisablePEP)
            {
                return true;
            }

            XacmlJsonResponse response = await GetDecisionForRequest(xacmlJsonRequest);
            return DecisionHelper.ValidatePdpDecision(response.Response, user);
        }

        private async Task<XacmlContextResponse> Authorize(XacmlContextRequest decisionRequest)
        {
            decisionRequest = await Enrich(decisionRequest);
            XacmlPolicy policy = await GetPolicyAsync(decisionRequest);

            Altinn.Authorization.ABAC.PolicyDecisionPoint pdp = new Altinn.Authorization.ABAC.PolicyDecisionPoint();
            XacmlContextResponse xacmlContextResponse = pdp.Authorize(decisionRequest, policy);
            return xacmlContextResponse;
        }

        public async Task<XacmlContextRequest> Enrich(XacmlContextRequest request)
        {
            await EnrichResourceAttributes(request);

            return request;
        }

        private async Task EnrichResourceAttributes(XacmlContextRequest request)
        {
            string orgAttributeValue = string.Empty;
            string appAttributeValue = string.Empty;
            string instanceAttributeValue = string.Empty;
            string resourcePartyAttributeValue = string.Empty;
            string taskAttributeValue = string.Empty;
            string endEventAttribute = string.Empty;

            XacmlContextAttributes resourceContextAttributes = request.GetResourceAttributes();

            foreach (XacmlAttribute attribute in resourceContextAttributes.Attributes)
            {
                if (attribute.AttributeId.OriginalString.Equals(orgAttributeId))
                {
                    orgAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(appAttributeId))
                {
                    appAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(instanceAttributeId))
                {
                    instanceAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(taskAttributeId))
                {
                    taskAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(partyAttributeId))
                {
                    resourcePartyAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(endEventAttributeId))
                {
                    endEventAttribute = attribute.AttributeValues.First().Value;
                }
            }

            bool resourceAttributeComplete = false;

            if (!string.IsNullOrEmpty(orgAttributeValue) &&
                !string.IsNullOrEmpty(appAttributeValue) &&
                !string.IsNullOrEmpty(instanceAttributeValue) &&
                !string.IsNullOrEmpty(resourcePartyAttributeValue) &&
                (!string.IsNullOrEmpty(taskAttributeValue) ||
                !string.IsNullOrEmpty(endEventAttribute)))
            {
                // The resource attributes are complete
                resourceAttributeComplete = true;
            }
            else if (!string.IsNullOrEmpty(orgAttributeValue) &&
                !string.IsNullOrEmpty(appAttributeValue) &&
                string.IsNullOrEmpty(instanceAttributeValue) &&
                !string.IsNullOrEmpty(resourcePartyAttributeValue) &&
                (!string.IsNullOrEmpty(taskAttributeValue) ||
                !string.IsNullOrEmpty(endEventAttribute)))
            {
                // The resource attributes are complete
                resourceAttributeComplete = true;
            }

            if (!resourceAttributeComplete)
            {
                Instance instanceData = await _instanceRepository.GetOne(instanceAttributeValue.Split('/')[1], Convert.ToInt32(instanceAttributeValue.Split('/')[0]));

                if (string.IsNullOrEmpty(orgAttributeValue) && instanceData != null)
                {
                    resourceContextAttributes.Attributes.Add(GetOrgAttribute(instanceData));
                }

                if (string.IsNullOrEmpty(appAttributeValue) && instanceData != null)
                {
                    resourceContextAttributes.Attributes.Add(GetAppAttribute(instanceData));
                }

                if (string.IsNullOrEmpty(taskAttributeValue) && instanceData?.Process?.CurrentTask != null)
                {
                    resourceContextAttributes.Attributes.Add(GetProcessElementAttribute(instanceData));
                }
                else if (string.IsNullOrEmpty(endEventAttribute) && instanceData?.Process?.EndEvent != null)
                {
                    resourceContextAttributes.Attributes.Add(GetEndEventAttribute(instanceData));
                }

                if (string.IsNullOrEmpty(resourcePartyAttributeValue) && instanceData != null)
                {
                    resourceContextAttributes.Attributes.Add(GetPartyAttribute(instanceData));
                }

                if (instanceData != null)
                {
                    resourcePartyAttributeValue = instanceData.InstanceOwner.PartyId;
                }
            }

            await EnrichSubjectAttributes(request, resourcePartyAttributeValue);
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

        private XacmlAttribute GetOrgAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(orgAttributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.Org));
            return attribute;
        }

        private XacmlAttribute GetAppAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(appAttributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.AppId.Split('/')[1]));
            return attribute;
        }

        private XacmlAttribute GetProcessElementAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(taskAttributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.Process.CurrentTask.ElementId));
            return attribute;
        }

        private XacmlAttribute GetEndEventAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(endEventAttributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.Process.EndEvent));
            return attribute;
        }

        private XacmlAttribute GetPartyAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(partyAttributeId), false);

            // When Party attribute is missing from input it is good to return it so PEP can get this information
            attribute.IncludeInResult = true;
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.InstanceOwner.PartyId));
            return attribute;
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
                string content = System.IO.File.ReadAllText(rolesPath);
                roles = (List<Role>)JsonConvert.DeserializeObject(content, typeof(List<Role>));
            }

            return Task.FromResult(roles);
        }

        private string GetRolesPath(int userId, int resourcePartyId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PDPMock).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Roles\User_" + userId + @"\party_" + resourcePartyId + @"\roles.json");
        }

        private async Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request)
        {
            return ParsePolicy("policy.xml", GetPolicyPath(request));
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
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PepWithPDPAuthorizationMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\apps\" + org + @"\" + app + @"\config\authorization\");
        }
    }
}

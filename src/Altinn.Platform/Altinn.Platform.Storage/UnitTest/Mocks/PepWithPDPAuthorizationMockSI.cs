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

using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.UnitTest.Constants;
using Altinn.Platform.Storage.UnitTest.Models;
using Altinn.Platform.Storage.UnitTest.Utils;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.UnitTest.Mocks
{
    public class PepWithPDPAuthorizationMockSI : IPDP
    {
        private readonly IInstanceRepository _instanceService;

        private readonly string OrgAttributeId = "urn:altinn:org";

        private readonly string AppAttributeId = "urn:altinn:app";

        private readonly string UserAttributeId = "urn:altinn:userid";

        private readonly string AltinnRoleAttributeId = "urn:altinn:rolecode";

        public PepWithPDPAuthorizationMockSI(IInstanceRepository instanceService)
        {
            this._instanceService = instanceService;
        }

        public async Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequestRoot xacmlJsonRequest)
        {
            RequestTracker.AddRequest("GetDecisionForRequest" + GetInstanceID(xacmlJsonRequest), xacmlJsonRequest);

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


            if (!resourceAttributeComplete)
            {
                Instance instanceData = await _instanceService.GetOne(resourceAttributes.InstanceValue, Convert.ToInt32(resourceAttributes.InstanceValue.Split('/')[0]));

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
                if (xacmlAttribute.AttributeId.OriginalString.Equals(UserAttributeId))
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
            }

            return resourceAttributes;
        }

        private XacmlAttribute GetRoleAttribute(List<Role> roles)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(AltinnRoleAttributeId), false);
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
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PepWithPDPAuthorizationMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\Roles\User_" + userId + @"\party_" + resourcePartyId + @"\roles.json");
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
                        if (asd.AttributeId.OriginalString.Equals(OrgAttributeId))
                        {
                            foreach (var asff in asd.AttributeValues)
                            {
                                org = asff.Value;
                                break;
                            }
                        }

                        if (asd.AttributeId.OriginalString.Equals(AppAttributeId))
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

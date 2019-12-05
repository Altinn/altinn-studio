using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Xml;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Configuration;
using Altinn.Common.PEP.Helpers;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Storage.IntegrationTest.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.IntegrationTest.Mocks
{
    public class PepWithPDPAuthorizationMockSI : IPDP
    {
        private readonly IInstanceRepository _instanceRepository;

        private readonly PepSettings _pepSettings;

        private readonly string _orgAttributeId = "urn:altinn:org";

        private readonly string _appAttributeId = "urn:altinn:app";

        private readonly string _instanceAttributeId = "urn:altinn:instance-id";

        private readonly string _taskAttributeId = "urn:altinn:task";

        private readonly string _partyAttributeId = "urn:altinn:partyid";

        private readonly string _userAttributeId = "urn:altinn:userid";

        private readonly string _altinnRoleAttributeId = "urn:altinn:rolecode";

        public PepWithPDPAuthorizationMockSI(IInstanceRepository instanceRepository, IOptions<PepSettings> pepSettings)
        {
            _instanceRepository = instanceRepository;
            _pepSettings = pepSettings.Value;
        }

        public async Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequestRoot xacmlJsonRequest)
        {
            try
            {
                XacmlContextRequest decisionRequest = XacmlJsonXmlConverter.ConvertRequest(xacmlJsonRequest.Request);
                decisionRequest = await Enrich(decisionRequest);

                Altinn.Authorization.ABAC.PolicyDecisionPoint pdp = new Altinn.Authorization.ABAC.PolicyDecisionPoint();

                XacmlPolicy policy = await GetPolicyAsync(decisionRequest);
                string responsePermit = File.ReadAllText("../../../data/Response/response_permit.json");
                XacmlContextResponse contextResponse = pdp.Authorize(decisionRequest, policy);

                return XacmlJsonXmlConverter.ConvertResponse(contextResponse);
            }
            catch (Exception ex)
            {
                string test = "test";
            }

            return null;
        }

        public async Task<bool> GetDecisionForUnvalidateRequest(XacmlJsonRequestRoot xacmlJsonRequest, ClaimsPrincipal user)
        {
            if (_pepSettings.DisablePEP)
            {
                return true;
            }

            XacmlJsonResponse response = await GetDecisionForRequest(xacmlJsonRequest);
            return DecisionHelper.ValidateResponse(response.Response, user);
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

            XacmlContextAttributes resourceContextAttributes = request.GetResourceAttributes();

            foreach (XacmlAttribute attribute in resourceContextAttributes.Attributes)
            {
                if (attribute.AttributeId.OriginalString.Equals(_orgAttributeId))
                {
                    orgAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(_appAttributeId))
                {
                    appAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(_instanceAttributeId))
                {
                    instanceAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(_taskAttributeId))
                {
                    taskAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(_partyAttributeId))
                {
                    resourcePartyAttributeValue = attribute.AttributeValues.First().Value;
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
                Instance instanceData = await _instanceRepository.GetOne(instanceAttributeValue.Split('/')[1].ToString(), Convert.ToInt32(instanceAttributeValue.Split('/')[0]));

                if (string.IsNullOrEmpty(orgAttributeValue) && instanceData != null)
                {
                    resourceContextAttributes.Attributes.Add(GetOrgAttribute(instanceData));
                }

                if (string.IsNullOrEmpty(appAttributeValue) && instanceData != null)
                {
                    resourceContextAttributes.Attributes.Add(GetAppAttribute(instanceData));
                }

                if (string.IsNullOrEmpty(taskAttributeValue) && instanceData != null && instanceData.Process != null && instanceData.Process.CurrentTask != null)
                {
                    resourceContextAttributes.Attributes.Add(GetProcessElementAttribute(instanceData));
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
                if (xacmlAttribute.AttributeId.OriginalString.Equals(_userAttributeId))
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
            XacmlAttribute attribute = new XacmlAttribute(new Uri(_orgAttributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.Org));
            return attribute;
        }

        private XacmlAttribute GetAppAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(_appAttributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.AppId.Split('/')[1]));
            return attribute;
        }

        private XacmlAttribute GetProcessElementAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(_taskAttributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.Process.CurrentTask.ElementId));
            return attribute;
        }

        private XacmlAttribute GetPartyAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(_partyAttributeId), false);

            // When Party attribute is missing from input it is good to return it so PEP can get this information
            attribute.IncludeInResult = true;
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.InstanceOwner.PartyId));
            return attribute;
        }

        private XacmlAttribute GetRoleAttribute(List<Role> roles)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(_altinnRoleAttributeId), false);
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
            throw new NotImplementedException();
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
                        if (asd.AttributeId.OriginalString.Equals(_orgAttributeId))
                        {
                            foreach (var asff in asd.AttributeValues)
                            {
                                org = asff.Value;
                                break;
                            }
                        }

                        if (asd.AttributeId.OriginalString.Equals(_appAttributeId))
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
            throw new NotImplementedException();

            /*string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PepWithPDPAuthorizationMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\apps\" + org + @"\" + app + @"\config\authorization\"); */
        }
    }
}

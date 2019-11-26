using Altinn.App.Services.Interface;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTestsRef.Models;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using System.Xml;

namespace App.IntegrationTests.Mocks.Services
{
    public class PepWithPDPAuthorizationMockSI : Altinn.Common.PEP.Interfaces.IPDP
    {
        private readonly IInstance _instanceService;

        private readonly string OrgAttributeId = "urn:altinn:org";

        private readonly string AppAttributeId = "urn:altinn:app";

        private readonly string InstanceAttributeId = "urn:altinn:instance-id";

        private readonly string TaskAttributeId = "urn:altinn:task";

        private readonly string PartyAttributeId = "urn:altinn:partyid";

        private readonly string UserAttributeId = "urn:altinn:user-id";

        private readonly string AltinnRoleAttributeId = "urn:altinn:rolecode";

        public PepWithPDPAuthorizationMockSI(IInstance instanceService)
        {
            this._instanceService = instanceService;
        }


        public async Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequest xacmlJsonRequest)
        {
            try
            {
                List<XacmlJsonCategory> resources = xacmlJsonRequest.Resource;

                XacmlContextRequest decisionRequest = XacmlJsonXmlConverter.ConvertRequest(xacmlJsonRequest);
                decisionRequest = await Enrich(decisionRequest);

                Altinn.Authorization.ABAC.PolicyDecisionPoint pdp = new Altinn.Authorization.ABAC.PolicyDecisionPoint();

                XacmlPolicy policy = await GetPolicyAsync(decisionRequest);
                XacmlContextResponse contextResponse = pdp.Authorize(decisionRequest, policy);

                return XacmlJsonXmlConverter.ConvertResponse(contextResponse);
            }
            catch (Exception ex)
            {
                string test = "test";
            }

            return null;
        }

        public Task<bool> GetDecisionForUnvalidateRequest(XacmlJsonRequest xacmlJsonRequest, ClaimsPrincipal user)
        {
            throw new NotImplementedException();
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
                if (attribute.AttributeId.OriginalString.Equals(OrgAttributeId))
                {
                    orgAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(AppAttributeId))
                {
                    appAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(InstanceAttributeId))
                {
                    instanceAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(TaskAttributeId))
                {
                    taskAttributeValue = attribute.AttributeValues.First().Value;
                }

                if (attribute.AttributeId.OriginalString.Equals(PartyAttributeId))
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
                Instance instanceData = await _instanceService.GetInstance(appAttributeValue, orgAttributeValue, Convert.ToInt32(instanceAttributeValue.Split('/')[0]), new Guid(instanceAttributeValue.Split('/')[1]));

                if (string.IsNullOrEmpty(orgAttributeValue))
                {
                    resourceContextAttributes.Attributes.Add(GetOrgAttribute(instanceData));
                }

                if (string.IsNullOrEmpty(appAttributeValue))
                {
                    resourceContextAttributes.Attributes.Add(GetAppAttribute(instanceData));
                }

                if (string.IsNullOrEmpty(taskAttributeValue))
                {
                    resourceContextAttributes.Attributes.Add(GetProcessElementAttribute(instanceData));
                }

                if (string.IsNullOrEmpty(resourcePartyAttributeValue))
                {
                    resourceContextAttributes.Attributes.Add(GetPartyAttribute(instanceData));
                }

                resourcePartyAttributeValue = instanceData.InstanceOwner.PartyId;
            }

            await EnrichSubjectAttributes(request, resourcePartyAttributeValue);
        }

        private async Task EnrichSubjectAttributes(XacmlContextRequest request, string resourceParty)
        {
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

        private XacmlAttribute GetOrgAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(OrgAttributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.Org));
            return attribute;
        }

        private XacmlAttribute GetAppAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(AppAttributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.AppId.Split('/')[1]));
            return attribute;
        }

        private XacmlAttribute GetProcessElementAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(TaskAttributeId), false);
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.Process.CurrentTask.ElementId));
            return attribute;
        }

        private XacmlAttribute GetPartyAttribute(Instance instance)
        {
            XacmlAttribute attribute = new XacmlAttribute(new Uri(PartyAttributeId), false);
            // When Party attribute is missing from input it is good to return it so PEP can get this information
            attribute.IncludeInResult = true;
            attribute.AttributeValues.Add(new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), instance.InstanceOwner.PartyId));
            return attribute;
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
                string content = System.IO.File.ReadAllText(rolesPath);
                roles = (List<Role>)JsonConvert.DeserializeObject(content, typeof(List<Role>));
            }

            return Task.FromResult(roles);
        }

        private string GetRolesPath(int userId, int resourcePartyId)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(PepAuthorizationMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, @"..\..\..\Data\pip\Roles\User_" + userId + @"\party_" + resourcePartyId + @"\roles.json");
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

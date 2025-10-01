using System.Security.Claims;
using System.Xml;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.Instances;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Configuration;
using Altinn.Common.PEP.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Authorization.Platform.Authorization.Models;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Api.Tests.Mocks;

public class PepWithPDPAuthorizationMockSI : Altinn.Common.PEP.Interfaces.IPDP
{
    private readonly IInstanceClient _instanceClient;

    private readonly PepSettings _pepSettings;

    public PepWithPDPAuthorizationMockSI(IInstanceClient instanceClient, IOptions<PepSettings> pepSettings)
    {
        this._instanceClient = instanceClient;
        _pepSettings = pepSettings.Value;
    }

    public async Task<XacmlJsonResponse> GetDecisionForRequest(XacmlJsonRequestRoot xacmlJsonRequest)
    {
        try
        {
            XacmlContextRequest decisionRequest = XacmlJsonXmlConverter.ConvertRequest(xacmlJsonRequest.Request);
            decisionRequest = await Enrich(decisionRequest);

            Authorization.ABAC.PolicyDecisionPoint pdp = new();

            XacmlPolicy policy = await GetPolicyAsync(decisionRequest);
            XacmlContextResponse contextResponse = pdp.Authorize(decisionRequest, policy);

            return XacmlJsonXmlConverter.ConvertResponse(contextResponse);
        }
        catch
        {
            return null!;
        }
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

        if (
            !string.IsNullOrEmpty(resourceAttributes.OrgValue)
            && !string.IsNullOrEmpty(resourceAttributes.AppValue)
            && !string.IsNullOrEmpty(resourceAttributes.InstanceValue)
            && !string.IsNullOrEmpty(resourceAttributes.ResourcePartyValue)
            && !string.IsNullOrEmpty(resourceAttributes.TaskValue)
        )
        {
            // The resource attributes are complete
            resourceAttributeComplete = true;
        }
        else if (
            !string.IsNullOrEmpty(resourceAttributes.OrgValue)
            && !string.IsNullOrEmpty(resourceAttributes.AppValue)
            && string.IsNullOrEmpty(resourceAttributes.InstanceValue)
            && !string.IsNullOrEmpty(resourceAttributes.ResourcePartyValue)
            && string.IsNullOrEmpty(resourceAttributes.TaskValue)
        )
        {
            // The resource attributes are complete
            resourceAttributeComplete = true;
        }
        else if (
            !string.IsNullOrEmpty(resourceAttributes.OrgValue)
            && !string.IsNullOrEmpty(resourceAttributes.AppValue)
            && !string.IsNullOrEmpty(resourceAttributes.InstanceValue)
            && !string.IsNullOrEmpty(resourceAttributes.ResourcePartyValue)
            && !string.IsNullOrEmpty(resourceAttributes.AppResourceValue)
            && resourceAttributes.AppResourceValue.Equals("events")
        )
        {
            // The resource attributes are complete
            resourceAttributeComplete = true;
        }

        if (!resourceAttributeComplete)
        {
            Instance instanceData = await _instanceClient.GetInstance(
                resourceAttributes.AppValue,
                resourceAttributes.OrgValue,
                Convert.ToInt32(resourceAttributes.InstanceValue.Split('/')[0]),
                new Guid(resourceAttributes.InstanceValue.Split('/')[1])
            );

            if (instanceData != null)
            {
                AddIfValueDoesNotExist(
                    resourceContextAttributes,
                    AltinnUrns.Org,
                    resourceAttributes.OrgValue,
                    instanceData.Org
                );
                string app = instanceData.AppId.Split("/")[1];
                AddIfValueDoesNotExist(resourceContextAttributes, AltinnUrns.App, resourceAttributes.AppValue, app);
                if (instanceData.Process?.CurrentTask != null)
                {
                    AddIfValueDoesNotExist(
                        resourceContextAttributes,
                        AltinnUrns.Task,
                        resourceAttributes.TaskValue,
                        instanceData.Process.CurrentTask.ElementId
                    );
                }
                else if (instanceData.Process?.EndEvent != null)
                {
                    AddIfValueDoesNotExist(
                        resourceContextAttributes,
                        AltinnUrns.EndEvent,
                        string.Empty,
                        instanceData.Process.EndEvent
                    );
                }

                AddIfValueDoesNotExist(
                    resourceContextAttributes,
                    AltinnUrns.PartyId,
                    resourceAttributes.ResourcePartyValue,
                    instanceData.InstanceOwner.PartyId
                );
                resourceAttributes.ResourcePartyValue = instanceData.InstanceOwner.PartyId;
            }
        }

        await EnrichSubjectAttributes(request, resourceAttributes.ResourcePartyValue);
    }

    private static void AddIfValueDoesNotExist(
        XacmlContextAttributes resourceAttributes,
        string attributeId,
        string attributeValue,
        string newAttributeValue
    )
    {
        if (string.IsNullOrEmpty(attributeValue))
        {
            resourceAttributes.Attributes.Add(GetAttribute(attributeId, newAttributeValue));
        }
    }

    private static XacmlAttribute GetAttribute(string attributeId, string attributeValue)
    {
        XacmlAttribute attribute = new(new Uri(attributeId), false);
        if (attributeId.Equals(AltinnUrns.PartyId))
        {
            // When Party attribute is missing from input it is good to return it so PEP can get this information
            attribute.IncludeInResult = true;
        }

        attribute.AttributeValues.Add(
            new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), attributeValue)
        );
        return attribute;
    }

    private static async Task EnrichSubjectAttributes(XacmlContextRequest request, string resourceParty)
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
            if (xacmlAttribute.AttributeId.OriginalString.Equals(AltinnUrns.UserId))
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

    private static XacmlResourceAttributes GetResourceAttributeValues(XacmlContextAttributes resourceContextAttributes)
    {
        XacmlResourceAttributes resourceAttributes = new();

        foreach (XacmlAttribute attribute in resourceContextAttributes.Attributes)
        {
            if (attribute.AttributeId.OriginalString.Equals(AltinnUrns.Org))
            {
                resourceAttributes.OrgValue = attribute.AttributeValues.First().Value;
            }

            if (attribute.AttributeId.OriginalString.Equals(AltinnUrns.App))
            {
                resourceAttributes.AppValue = attribute.AttributeValues.First().Value;
            }

            if (attribute.AttributeId.OriginalString.Equals(AltinnUrns.InstanceId))
            {
                resourceAttributes.InstanceValue = attribute.AttributeValues.First().Value;
            }

            if (attribute.AttributeId.OriginalString.Equals(AltinnUrns.PartyId))
            {
                resourceAttributes.ResourcePartyValue = attribute.AttributeValues.First().Value;
            }

            if (attribute.AttributeId.OriginalString.Equals(AltinnUrns.Task))
            {
                resourceAttributes.TaskValue = attribute.AttributeValues.First().Value;
            }

            if (attribute.AttributeId.OriginalString.Equals(AltinnUrns.AppResource))
            {
                resourceAttributes.AppResourceValue = attribute.AttributeValues.First().Value;
            }
        }

        return resourceAttributes;
    }

    private static XacmlAttribute GetRoleAttribute(List<Role> roles)
    {
        XacmlAttribute attribute = new(new Uri(AltinnUrns.RoleCode), false);
        foreach (Role role in roles)
        {
            attribute.AttributeValues.Add(
                new XacmlAttributeValue(new Uri(XacmlConstants.DataTypes.XMLString), role.Value)
            );
        }

        return attribute;
    }

    public static Task<List<Role>> GetDecisionPointRolesForUser(int coveredByUserId, int offeredByPartyId)
    {
        string rolesPath = TestData.GetTestDataRolesFolder(coveredByUserId, offeredByPartyId);

        List<Role> roles = new();

        if (File.Exists(rolesPath))
        {
            string content = File.ReadAllText(rolesPath);
            roles =
                JsonConvert.DeserializeObject<List<Role>>(content)
                ?? throw new InvalidDataException(
                    $"Something went wrong deserializing json for roles from path {rolesPath}"
                );
        }

        return Task.FromResult(roles);
    }

    private static Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request)
    {
        return Task.FromResult(ParsePolicy("policy.xml", GetPolicyPath(request)));
    }

    private static string GetPolicyPath(XacmlContextRequest request)
    {
        string org = string.Empty;
        string app = string.Empty;
        foreach (XacmlContextAttributes attr in request.Attributes)
        {
            if (attr.Category.OriginalString.Equals(XacmlConstants.MatchAttributeCategory.Resource))
            {
                foreach (XacmlAttribute xacmlAttribute in attr.Attributes)
                {
                    if (
                        xacmlAttribute.AttributeId.OriginalString.Equals(AltinnUrns.Org)
                        && xacmlAttribute.AttributeValues.FirstOrDefault() != null
                    )
                    {
                        org = xacmlAttribute.AttributeValues.First().Value;
                    }

                    if (
                        xacmlAttribute.AttributeId.OriginalString.Equals(AltinnUrns.App)
                        && xacmlAttribute.AttributeValues.FirstOrDefault() != null
                    )
                    {
                        app = xacmlAttribute.AttributeValues.First().Value;
                    }
                }
            }
        }

        return TestData.GetAltinnAppsPolicyPath(org, app);
    }

    public static XacmlPolicy ParsePolicy(string policyDocumentTitle, string policyPath)
    {
        XmlDocument policyDocument = new();
        policyDocument.Load(Path.Join(policyPath, policyDocumentTitle));
        XacmlPolicy policy;
        using (XmlReader reader = XmlReader.Create(new StringReader(policyDocument.OuterXml)))
        {
            policy = XacmlParser.ParseXacmlPolicy(reader);
        }

        return policy;
    }
}

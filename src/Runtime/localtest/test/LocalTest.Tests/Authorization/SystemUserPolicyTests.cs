using System.Security.Claims;
using System.Text.Json;
using System.Xml;
using Altinn.Authorization.ABAC;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Constants;
using Altinn.Common.PEP.Helpers;
using Altinn.Platform.Authorization.Controllers;
using AltinnCore.Authentication.Constants;
using LocalTest.Services.Authentication.Implementation;
using Xunit;

namespace LocalTest.Tests.Authorization;

/// <summary>
/// A system user is not named in the app's policy.xml, so localtest authorizes it with a policy it builds in
/// memory. That policy must carry the app policy's minimum authentication level obligations, like the real
/// PDP does for delegation policies, so that an app requiring level 4 only admits a system user (always level 3)
/// when the policy relaxes the requirement with <c>urn:altinn:minimum-authenticationlevel-systemuser</c>.
/// The obligations are then enforced by Altinn.Common.PEP in the app and in localtest's storage emulation.
/// </summary>
public class SystemUserPolicyTests
{
    private const string SystemUserId = "d111dbab-d619-4f15-bf29-58fe570a9ae6";

    [Fact]
    public void SystemUserPolicy_CarriesTheAppPolicyObligations()
    {
        XacmlJsonResult result = AuthorizeSystemUser(AppPolicy(systemUserLevel: 3));

        Assert.Equal("Permit", result.Decision);
        List<XacmlJsonAttributeAssignment> obligations = result
            .Obligations.SelectMany(o => o.AttributeAssignment)
            .ToList();
        Assert.Contains(
            obligations,
            a => a.Category == "urn:altinn:minimum-authenticationlevel" && a.Value == "4"
        );
        Assert.Contains(
            obligations,
            a => a.Category == "urn:altinn:minimum-authenticationlevel-systemuser" && a.Value == "3"
        );
    }

    [Fact]
    public void SystemUser_Level4AppWithSystemUserObligation_IsAuthorized()
    {
        XacmlJsonResult result = AuthorizeSystemUser(AppPolicy(systemUserLevel: 3));

        Assert.True(DecisionHelper.ValidatePdpDecision([result], SystemUserPrincipal()));
    }

    [Fact]
    public void SystemUser_Level4AppWithoutSystemUserObligation_IsNotAuthorized()
    {
        XacmlJsonResult result = AuthorizeSystemUser(AppPolicy(systemUserLevel: null));

        Assert.Equal("Permit", result.Decision);
        Assert.False(DecisionHelper.ValidatePdpDecision([result], SystemUserPrincipal()));
        var detailed = DecisionHelper.ValidatePdpDecisionDetailed([result], SystemUserPrincipal());
        Assert.Equal("4", detailed.FailedObligations[AltinnObligations.RequiredAuthenticationLevel]);
    }

    [Fact]
    public void CopyObligations_LeavesExistingObligationsAlone()
    {
        XacmlPolicy appPolicy = AppPolicy(systemUserLevel: 3);
        XacmlPolicy delegationPolicy = AppPolicy(systemUserLevel: null);
        XacmlObligationExpression existing = delegationPolicy.ObligationExpressions.Single();

        DecisionController.CopyObligations(appPolicy, delegationPolicy);

        Assert.Same(existing, delegationPolicy.ObligationExpressions.Single());
    }

    /// <summary>
    /// Runs the PDP over the system user policy localtest builds for a read request on ttd/level-4-app.
    /// </summary>
    private static XacmlJsonResult AuthorizeSystemUser(XacmlPolicy appPolicy)
    {
        XacmlContextRequest request = XacmlJsonXmlConverter.ConvertRequest(
            new XacmlJsonRequest
            {
                AccessSubject = [Category(("urn:altinn:systemuser:uuid", SystemUserId))],
                Resource = [Category(("urn:altinn:org", "ttd"), ("urn:altinn:app", "level-4-app"))],
                Action = [Category(("urn:oasis:names:tc:xacml:1.0:action:action-id", "read"))],
            }
        );
        XacmlContextAttributes resourceAttributes = request.Attributes.Single(a =>
            a.Category.OriginalString == XacmlConstants.MatchAttributeCategory.Resource
        );
        var systemUserAttrValue = new XacmlAttributeValue(
            new Uri(XacmlConstants.DataTypes.XMLString),
            SystemUserId
        );

        XacmlPolicy systemUserPolicy = DecisionController.CreateSystemUserPolicy(
            systemUserAttrValue,
            resourceAttributes,
            ["read", "write"],
            appPolicy
        );

        XacmlContextResponse response = new PolicyDecisionPoint().Authorize(request, systemUserPolicy);
        return XacmlJsonXmlConverter.ConvertResponse(response).Response.Single();
    }

    private static XacmlJsonCategory Category(params (string Id, string Value)[] attributes) =>
        new()
        {
            Attribute = attributes
                .Select(a => new XacmlJsonAttribute
                {
                    AttributeId = a.Id,
                    Value = a.Value,
                    DataType = "string",
                })
                .ToList(),
        };

    /// <summary>
    /// The claims localtest puts in a system user token, see
    /// <see cref="TestAuthenticationService.GenerateTokenForSystemUser"/>.
    /// </summary>
    private static ClaimsPrincipal SystemUserPrincipal()
    {
        AuthorizationDetailsClaim authorizationDetails = new SystemUserAuthorizationDetailsClaim(
            [Guid.Parse(SystemUserId)],
            "913312465_sbs",
            new OrgClaim("iso6523-actorid-upis", "0192:950474084")
        );
        return new ClaimsPrincipal(
            new ClaimsIdentity(
                [
                    new Claim("authorization_details", JsonSerializer.Serialize(authorizationDetails)),
                    new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "3"),
                ]
            )
        );
    }

    /// <summary>
    /// An app policy requiring authentication level 4, with an optional relaxation for system users. The
    /// rule does not matter here, since the system user policy is what the PDP evaluates.
    /// </summary>
    private static XacmlPolicy AppPolicy(int? systemUserLevel)
    {
        string systemUserObligation =
            systemUserLevel is null
                ? ""
                : $"""
                    <xacml:ObligationExpression FulfillOn="Permit" ObligationId="urn:altinn:obligation:authenticationLevel3">
                      <xacml:AttributeAssignmentExpression AttributeId="urn:altinn:obligation3-assignment3" Category="urn:altinn:minimum-authenticationlevel-systemuser">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#integer">{systemUserLevel}</xacml:AttributeValue>
                      </xacml:AttributeAssignmentExpression>
                    </xacml:ObligationExpression>
                    """;
        string xml = $"""
            <?xml version="1.0" encoding="utf-8"?>
            <xacml:Policy xmlns:xacml="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17" PolicyId="urn:altinn:example:policyid:1" Version="1.0" RuleCombiningAlgId="urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:deny-overrides">
              <xacml:Target/>
              <xacml:Rule RuleId="urn:altinn:example:ruleid:1" Effect="Permit">
                <xacml:Description>Users with role DAGL can read ttd/level-4-app</xacml:Description>
                <xacml:Target>
                  <xacml:AnyOf>
                    <xacml:AllOf>
                      <xacml:Match MatchId="urn:oasis:names:tc:xacml:3.0:function:string-equal-ignore-case">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">DAGL</xacml:AttributeValue>
                        <xacml:AttributeDesignator AttributeId="urn:altinn:rolecode" Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
                      </xacml:Match>
                    </xacml:AllOf>
                  </xacml:AnyOf>
                  <xacml:AnyOf>
                    <xacml:AllOf>
                      <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">ttd</xacml:AttributeValue>
                        <xacml:AttributeDesignator AttributeId="urn:altinn:org" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
                      </xacml:Match>
                      <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">level-4-app</xacml:AttributeValue>
                        <xacml:AttributeDesignator AttributeId="urn:altinn:app" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:resource" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
                      </xacml:Match>
                    </xacml:AllOf>
                  </xacml:AnyOf>
                  <xacml:AnyOf>
                    <xacml:AllOf>
                      <xacml:Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                        <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">read</xacml:AttributeValue>
                        <xacml:AttributeDesignator AttributeId="urn:oasis:names:tc:xacml:1.0:action:action-id" Category="urn:oasis:names:tc:xacml:3.0:attribute-category:action" DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false"/>
                      </xacml:Match>
                    </xacml:AllOf>
                  </xacml:AnyOf>
                </xacml:Target>
              </xacml:Rule>
              <xacml:ObligationExpressions>
                <xacml:ObligationExpression FulfillOn="Permit" ObligationId="urn:altinn:obligation:authenticationLevel1">
                  <xacml:AttributeAssignmentExpression AttributeId="urn:altinn:obligation1-assignment1" Category="urn:altinn:minimum-authenticationlevel">
                    <xacml:AttributeValue DataType="http://www.w3.org/2001/XMLSchema#integer">4</xacml:AttributeValue>
                  </xacml:AttributeAssignmentExpression>
                </xacml:ObligationExpression>
                {systemUserObligation}
              </xacml:ObligationExpressions>
            </xacml:Policy>
            """;
        using XmlReader reader = XmlReader.Create(new StringReader(xml));
        return XacmlParser.ParseXacmlPolicy(reader);
    }
}

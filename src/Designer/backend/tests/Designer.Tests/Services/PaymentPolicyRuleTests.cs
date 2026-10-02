using System;
using System.Collections.Generic;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.Designer.Services.Implementation.ProcessModeling;
using Altinn.Studio.PolicyAdmin;
using Altinn.Studio.PolicyAdmin.Models;
using Xunit;

namespace Designer.Tests.Services;

// Keep these expected defaults aligned with frontend PaymentPolicyBuilder.test.tsx.
public sealed class PaymentPolicyRuleTests
{
    private const string ExpectedRuleId = "urn:altinn:resource:app_testOrg_testApp:policyid:1:ruleid:testTaskId";
    private const string ExpectedDescription =
        "Rule that defines that user with specified role(s) can pay, reject and confirm for testOrg/testApp when it is in payment task";

    [Fact]
    public void RuleId_MatchesFrontendPaymentRuleId()
    {
        Assert.Equal(ExpectedRuleId, PaymentPolicyRule.RuleId("testOrg", "testApp", "testTaskId"));
    }

    [Fact]
    public void Create_MatchesFrontendPaymentDefaults()
    {
        PolicyRule rule = PaymentPolicyRule.Create("testOrg", "testApp", "testTaskId");

        AssertExpectedRule(rule);
    }

    [Fact]
    public void CreateXacmlRule_RoundTripsPaymentDefaults()
    {
        XacmlRule xacmlRule = PaymentPolicyRule.CreateXacmlRule("testOrg", "testApp", "testTaskId");
        var policy = new XacmlPolicy(
            new Uri("urn:altinn:policyid:1"),
            new Uri("urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:deny-overrides"),
            new XacmlTarget([])
        );
        policy.Rules.Add(xacmlRule);

        PolicyRule rule = Assert.Single(PolicyConverter.ConvertPolicy(policy).Rules);

        AssertExpectedRule(rule);
        Assert.Empty(rule.AccessPackages);
    }

    private static void AssertExpectedRule(PolicyRule rule)
    {
        Assert.Equal(ExpectedRuleId, rule.RuleId);
        Assert.Equal(ExpectedDescription, rule.Description);
        Assert.Empty(rule.Subject);
        Assert.Equal(["read", "pay", "confirm", "reject"], rule.Actions);
        List<string> resources = Assert.Single(rule.Resources);
        Assert.Equal(["urn:altinn:org:testOrg", "urn:altinn:app:testApp", "urn:altinn:task:testTaskId"], resources);
    }
}

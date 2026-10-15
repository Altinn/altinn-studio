using System.Collections.Generic;
using System.Linq;
using Altinn.Authorization.ABAC.Constants;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Studio.PolicyAdmin;
using Altinn.Studio.PolicyAdmin.Models;
using Xunit;

namespace Designer.Tests.Helpers;

public class PolicyConverterTests
{
    [Theory]
    [InlineData("urn:altinn:app:a1-1269-5942:1", "urn:altinn:app", "a1-1269-5942:1")]
    [InlineData("urn:altinn:app:my-app", "urn:altinn:app", "my-app")]
    [InlineData("urn:altinn:org:ttd", "urn:altinn:org", "ttd")]
    [InlineData("urn:altinn:resource:my-resource", "urn:altinn:resource", "my-resource")]
    [InlineData("urn:altinn:task:Task_1", "urn:altinn:task", "Task_1")]
    public void ConvertPolicy_ResourcePolicyToXacml_SplitsResourceIntoAttributeIdAndValue(
        string resource,
        string expectedAttributeId,
        string expectedAttributeValue
    )
    {
        // Arrange
        ResourcePolicy resourcePolicy = CreateResourcePolicyWithResource(resource);

        // Act
        XacmlPolicy xacmlPolicy = PolicyConverter.ConvertPolicy(resourcePolicy);

        // Assert
        XacmlMatch resourceMatch = GetSingleResourceMatch(xacmlPolicy);
        Assert.Equal(expectedAttributeId, resourceMatch.AttributeDesignator.AttributeId.OriginalString);
        Assert.Equal(expectedAttributeValue, resourceMatch.AttributeValue.Value);
    }

    [Fact]
    public void ConvertPolicy_RoundTripWithAppValueContainingColon_PreservesAttributeIdAndValue()
    {
        // Arrange
        XacmlPolicy originalPolicy = PolicyConverter.ConvertPolicy(
            CreateResourcePolicyWithResource("urn:altinn:app:a1-1269-5942:1")
        );

        // Act
        ResourcePolicy resourcePolicy = PolicyConverter.ConvertPolicy(originalPolicy);
        XacmlPolicy convertedBackPolicy = PolicyConverter.ConvertPolicy(resourcePolicy);

        // Assert
        XacmlMatch resourceMatch = GetSingleResourceMatch(convertedBackPolicy);
        Assert.Equal("urn:altinn:app", resourceMatch.AttributeDesignator.AttributeId.OriginalString);
        Assert.Equal("a1-1269-5942:1", resourceMatch.AttributeValue.Value);
    }

    private static ResourcePolicy CreateResourcePolicyWithResource(string resource)
    {
        return new ResourcePolicy
        {
            Rules =
            [
                new PolicyRule
                {
                    RuleId = "urn:altinn:resource:my-resource:ruleid:1",
                    Subject = ["urn:altinn:rolecode:dagl"],
                    Actions = ["read"],
                    Resources =
                    [
                        [resource],
                    ],
                },
            ],
        };
    }

    private static XacmlMatch GetSingleResourceMatch(XacmlPolicy xacmlPolicy)
    {
        IEnumerable<XacmlMatch> resourceMatches = xacmlPolicy
            .Rules.Single()
            .Target.AnyOf.SelectMany(anyOf => anyOf.AllOf)
            .SelectMany(allOf => allOf.Matches)
            .Where(match =>
                match.AttributeDesignator.Category.AbsoluteUri.Equals(XacmlConstants.MatchAttributeCategory.Resource)
            );
        return Assert.Single(resourceMatches);
    }
}

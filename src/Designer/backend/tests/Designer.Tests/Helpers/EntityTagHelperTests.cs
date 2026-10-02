using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.PolicyAdmin.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Designer.Tests.Helpers;

public class EntityTagHelperTests
{
    [Fact]
    public void ComputeEntityTag_ReturnsAQuotedLowercaseSha256()
    {
        string entityTag = EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule"));

        Assert.Matches("^\"[0-9a-f]{64}\"$", entityTag);
    }

    [Fact]
    public void ComputeEntityTag_DependsOnlyOnTheContentOfTheDocument()
    {
        Assert.Equal(
            EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule")),
            EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule"))
        );
        Assert.NotEqual(
            EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule")),
            EntityTagHelper.ComputeEntityTag(CreatePolicy("Another rule"))
        );
    }

    [Fact]
    public void CheckIfMatch_WithTheCurrentEntityTag_Succeeds()
    {
        string current = EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule"));

        Assert.Null(EntityTagHelper.CheckIfMatch(CreateRequest(current), current));
    }

    [Fact]
    public void CheckIfMatch_WithTheCurrentEntityTagInAList_Succeeds()
    {
        string current = EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule"));
        string other = EntityTagHelper.ComputeEntityTag(CreatePolicy("Another rule"));

        Assert.Null(EntityTagHelper.CheckIfMatch(CreateRequest($"{other}, {current}"), current));
    }

    [Fact]
    public void CheckIfMatch_WithAnAsterisk_Succeeds()
    {
        string current = EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule"));

        Assert.Null(EntityTagHelper.CheckIfMatch(CreateRequest("*"), current));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void CheckIfMatch_WithoutIfMatch_ReturnsPreconditionRequired(string ifMatch)
    {
        string current = EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule"));

        ObjectResult result = EntityTagHelper.CheckIfMatch(CreateRequest(ifMatch), current);

        Assert.Equal(StatusCodes.Status428PreconditionRequired, result?.StatusCode);
    }

    [Fact]
    public void CheckIfMatch_WithAnOutdatedEntityTag_ReturnsPreconditionFailed()
    {
        string current = EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule"));
        string outdated = EntityTagHelper.ComputeEntityTag(CreatePolicy("Another rule"));

        ObjectResult result = EntityTagHelper.CheckIfMatch(CreateRequest(outdated), current);

        Assert.Equal(StatusCodes.Status412PreconditionFailed, result?.StatusCode);
    }

    [Fact]
    public void CheckIfMatch_WithAWeakEntityTag_ReturnsPreconditionFailed()
    {
        string current = EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule"));

        ObjectResult result = EntityTagHelper.CheckIfMatch(CreateRequest($"W/{current}"), current);

        Assert.Equal(StatusCodes.Status412PreconditionFailed, result?.StatusCode);
    }

    [Fact]
    public void CheckIfMatch_WithAnUnquotedEntityTag_ReturnsPreconditionFailed()
    {
        string current = EntityTagHelper.ComputeEntityTag(CreatePolicy("A rule"));

        ObjectResult result = EntityTagHelper.CheckIfMatch(CreateRequest(current.Trim('"')), current);

        Assert.Equal(StatusCodes.Status412PreconditionFailed, result?.StatusCode);
    }

    private static ResourcePolicy CreatePolicy(string description) =>
        new()
        {
            Rules = [new PolicyRule { RuleId = "1", Description = description }],
            RequiredAuthenticationLevelEndUser = "3",
        };

    private static HttpRequest CreateRequest(string ifMatch)
    {
        var httpContext = new DefaultHttpContext();
        if (ifMatch is not null)
        {
            httpContext.Request.Headers.IfMatch = ifMatch;
        }
        return httpContext.Request;
    }
}

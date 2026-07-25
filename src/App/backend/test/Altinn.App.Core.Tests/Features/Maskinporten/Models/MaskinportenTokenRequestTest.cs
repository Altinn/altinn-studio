using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Tests.Features.Maskinporten.Models;

public class MaskinportenTokenRequestTest
{
    [Theory]
    [InlineData(new[] { "a", "b", "c" }, "a b c")]
    [InlineData(new[] { "a b", "c" }, "a b c")]
    [InlineData(new[] { "a b c" }, "a b c")]
    [InlineData(new[] { "a", "a", "b", "b", "c", "c" }, "a b c")]
    [InlineData(new[] { " a ", "", "  ", "b" }, "a b")]
    [InlineData(new[] { "c", "b", "a" }, "a b c")]
    [InlineData(new[] { "a\tb" }, "a b")]
    public void Scopes_AreNormalised(string[] input, string expected)
    {
        var request = new MaskinportenTokenRequest { Scopes = input };

        Assert.Equal(expected, request.FormattedScopes);
        Assert.Equal(expected.Split(' '), request.Scopes);
    }

    [Fact]
    public void Scopes_CannotBeMutatedThroughTheGetter()
    {
        var request = new MaskinportenTokenRequest { Scopes = ["a", "b"] };

        Assert.IsNotType<string[]>(request.Scopes);
        Assert.Throws<NotSupportedException>(() => ((ICollection<string>)request.Scopes).Clear());
    }

    [Theory]
    [InlineData((object)new string[] { })]
    [InlineData((object)new[] { "" })]
    [InlineData((object)new[] { "   " })]
    public void Scopes_RejectsEmptyInput(string[] input)
    {
        var act = () => new MaskinportenTokenRequest { Scopes = input };

        var ex = Assert.Throws<ArgumentException>(act);
        Assert.Equal("Scopes", ex.ParamName);
    }

    [Fact]
    public void Scopes_RejectsNull()
    {
        var act = () => new MaskinportenTokenRequest { Scopes = null! };

        Assert.Throws<ArgumentNullException>(act);
    }

    [Fact]
    public void Scopes_AreEnumeratedOnce()
    {
        var enumerationCount = 0;
        IEnumerable<string> scopes = Enumerate();

        var request = new MaskinportenTokenRequest { Scopes = scopes };
        _ = request.FormattedScopes;
        _ = request.Scopes.ToArray();

        Assert.Equal(1, enumerationCount);

        IEnumerable<string> Enumerate()
        {
            enumerationCount++;
            yield return "a";
        }
    }

    [Theory]
    [InlineData("https://api.example.com/v1")]
    [InlineData("urn:example:api")]
    public void Resource_AcceptsAbsoluteUris(string input)
    {
        var request = new MaskinportenTokenRequest { Scopes = ["a"], Resource = input };

        Assert.Equal(input, request.Resource);
    }

    [Theory]
    [InlineData("/relative/path")]
    [InlineData("not a uri")]
    public void Resource_RejectsNonAbsoluteUris(string input)
    {
        var act = () => new MaskinportenTokenRequest { Scopes = ["a"], Resource = input };

        var ex = Assert.Throws<ArgumentException>(act);
        Assert.Equal("Resource", ex.ParamName);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Resource_TreatsBlankAsUnset(string? input)
    {
        var request = new MaskinportenTokenRequest { Scopes = ["a"], Resource = input };

        Assert.Null(request.Resource);
    }

    [Fact]
    public void Resource_IsTrimmed()
    {
        var request = new MaskinportenTokenRequest { Scopes = ["a"], Resource = "  https://api.example.com  " };

        Assert.Equal("https://api.example.com", request.Resource);
    }

    [Fact]
    public void ConsumerOrg_RejectsDefaultOrganisationNumber()
    {
        var act = () => new MaskinportenTokenRequest { Scopes = ["a"], ConsumerOrg = default(OrganisationNumber) };

        var ex = Assert.Throws<ArgumentException>(act);
        Assert.Equal("ConsumerOrg", ex.ParamName);
    }

    [Fact]
    public void SystemUser_RejectsDefaultOrganisationNumber()
    {
        var act = () => new MaskinportenSystemUser { Organisation = default };

        var ex = Assert.Throws<ArgumentException>(act);
        Assert.Equal("Organisation", ex.ParamName);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void SystemUser_TreatsBlankExternalRefAsUnset(string? input)
    {
        var systemUser = new MaskinportenSystemUser
        {
            Organisation = OrganisationNumber.Parse("991825827"),
            ExternalRef = input,
        };

        Assert.Null(systemUser.ExternalRef);
    }

    [Fact]
    public void Equality_IsStructural()
    {
        // Notably, the synthesised record equality would compare the scope collection by reference
        var request1 = new MaskinportenTokenRequest
        {
            Scopes = ["a", "b"],
            ConsumerOrg = OrganisationNumber.Parse("991825827"),
            Resource = "https://api.example.com",
            SystemUser = new MaskinportenSystemUser
            {
                Organisation = OrganisationNumber.Parse("311169963"),
                ExternalRef = "ref",
            },
        };
        var request2 = request1 with
        {
            Scopes = new List<string> { "a", "b" },
        };

        Assert.Equal(request1, request2);
        Assert.Equal(request1.GetHashCode(), request2.GetHashCode());
        Assert.Equal(request1, request1 with { Scopes = ["b", "a"] }); // scope order is not significant
        Assert.NotEqual(request1, request1 with { Scopes = ["a"] });
        Assert.NotEqual(request1, request1 with { Resource = "https://other.example.com" });
        Assert.NotEqual(request1, request1 with { ConsumerOrg = null });
        Assert.NotEqual(request1, request1 with { SystemUser = null });
    }

    [Fact]
    public void With_PreservesNormalisation()
    {
        var request = new MaskinportenTokenRequest { Scopes = ["a"] } with { Scopes = ["b c", "b"] };

        Assert.Equal("b c", request.FormattedScopes);
    }
}

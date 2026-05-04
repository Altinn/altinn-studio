using Altinn.App.Core.Features.Auth;

namespace Altinn.App.Core.Tests.Features.Auth;

public class ScopesTests
{
    [Theory]
    [InlineData("scope1", "scope1", true)]
    [InlineData("SCOPE1", "scope1", false)]
    [InlineData(" scope1", "scope1", true)]
    [InlineData(" scope1 ", "scope1", true)]
    [InlineData("scope1", "scope2", false)]
    [InlineData("scope1 scope2", "scope1", true)]
    [InlineData("scope1  scope2", "scope1", true)]
    [InlineData("scope1   scope2", "scope1", true)]
    [InlineData("scope1\tscope2", "scope1", true)]
    [InlineData("scope1\nscope2", "scope1", true)]
    [InlineData("scope1\r\nscope2", "scope1", true)]
    [InlineData("scope1\tscope2", "scope2", true)]
    [InlineData("scope1\nscope2", "scope2", true)]
    [InlineData("scope1\r\nscope2", "scope2", true)]
    [InlineData("scope1 scope2", "scope2", true)]
    [InlineData("scope1 scope2", "scope3", false)]
    [InlineData("scope1  scope2", "scope3", false)]
    [InlineData("scope1   scope2", "scope3", false)]
    [InlineData("scope1\tscope2", "scope3", false)]
    [InlineData("scope1\nscope2", "scope3", false)]
    [InlineData("prefixscope1", "scope1", false)]
    [InlineData("scope1suffix", "scope1", false)]
    [InlineData("prefixscope1suffix", "scope1", false)]
    [InlineData(null, "scope1", false)]
    [InlineData("", "scope1", false)]
    [InlineData("  ", "scope1", false)]
    public void HasScope_Returns(string? inputScopes, string scopeToCheck, bool expected)
    {
        var scopes = new Scopes(inputScopes);
        Assert.Equal(expected, scopes.HasScope(scopeToCheck));
    }

    [Theory]
    [InlineData("altinn:instances.write", "altinn:", true)]
    [InlineData("altinn:instances.write", "altinn:serviceowner", false)]
    [InlineData("altinn:serviceowner/instances.write", "altinn:serviceowner", true)]
    [InlineData("altinn:serviceowner/instances.write", "altinn:serviceowner/", true)]
    [InlineData("ALTINN:serviceowner/instances.write", "altinn:serviceowner", false)]
    [InlineData("test:altinn:serviceowner/instances.write", "altinn:serviceowner", false)]
    [InlineData("aaltinn:serviceowner/instances.write", "altinn:serviceowner", false)]
    [InlineData(null, "scope1", false)]
    [InlineData("", "scope1", false)]
    [InlineData("  ", "scope1", false)]
    public void HasScopePrefix_Returns(string? inputScopes, string prefixToCheck, bool expected)
    {
        var scopes = new Scopes(inputScopes);
        Assert.Equal(expected, scopes.HasScopeWithPrefix(prefixToCheck));
    }

    public static TheoryData<string, string[]> IterationInputs = new()
    {
        { "scope1 scope2", ["scope1", "scope2"] },
        { " scope1 scope2", ["scope1", "scope2"] },
        { " scope1 scope2 ", ["scope1", "scope2"] },
        { " scope1  scope2 ", ["scope1", "scope2"] },
        { " scope1  scope2 scope3 ", ["scope1", "scope2", "scope3"] },
        { "scope1", ["scope1"] },
        { " scope1", ["scope1"] },
        { "scope1 ", ["scope1"] },
        { " scope1 ", ["scope1"] },
        { "", [] },
        { null!, [] },
        { " ", [] },
    };

    [Theory]
    [MemberData(nameof(IterationInputs))]
    public void Iteration(string? inputScopes, string[] expectedScopes)
    {
        var scopes = new Scopes(inputScopes);
        int i = 0;
        foreach (var scope in scopes)
        {
            Assert.True(expectedScopes[i].AsSpan().SequenceEqual(scope));
            i++;
        }
        Assert.Equal(i, expectedScopes.Length);
    }

    [Theory]
    [InlineData("altinn:instances.read", true)]
    [InlineData("altinn:instances.write", true)]
    [InlineData("altinn:serviceowner/instances.read", true)]
    [InlineData("altinn:serviceowner/instances.write", true)]
    [InlineData("altinn:instances.read altinn:instances.write", true)]
    [InlineData("other:scope altinn:instances.read", true)]
    [InlineData("altinn:instances.read other:scope", true)]
    [InlineData("ALTINN:instances.read", false)] // case sensitive
    [InlineData("altinn:instance.read", false)] // typo
    [InlineData("altinn:serviceowner/instance.read", false)] // typo
    [InlineData("digdir:dd:probatedeclarations", false)]
    [InlineData("custom:instances.read", false)]
    [InlineData("altinn:correspondence.write", false)]
    [InlineData("altinn:portal/enduser", false)]
    [InlineData(null, false)]
    [InlineData("", false)]
    [InlineData("  ", false)]
    public void HasAltinnInstanceScope_Returns(string? inputScopes, bool expected)
    {
        var scopes = new Scopes(inputScopes);
        Assert.Equal(expected, scopes.HasAltinnInstanceScope());
    }
}

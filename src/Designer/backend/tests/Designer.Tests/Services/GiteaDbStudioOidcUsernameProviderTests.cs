#nullable disable
using Altinn.Studio.Designer.Services.Implementation;
using Xunit;

namespace Designer.Tests.Services;

public class GiteaDbStudioOidcUsernameProviderTests
{
    [Theory]
    [InlineData("Ole", "Hansen", "ole_hansen_")]
    [InlineData("ole", "hansen", "ole_hansen_")]
    [InlineData("OLE BJØRN", "HANSEN BERG", "ole_bjorn_hansen_berg_")]
    [InlineData("Ærlig", "Ødegård", "aerlig_odegard_")]
    [InlineData("Åse", "Ås", "ase_as_")]
    [InlineData("DEDIKERT MUNTER", "FLAMME FISKEBUTIKK", "dedikert_munter_flamme_fiskebutikk_")]
    public void GenerateUsername_WithFirstAndLastName_ContainsBothNames(
        string givenName,
        string familyName,
        string expectedPrefix
    )
    {
        string result = GiteaDbStudioOidcUsernameProvider.GenerateUsername(givenName, familyName);

        Assert.StartsWith(expectedPrefix, result);
        Assert.Matches("^[a-z_]+_[a-z0-9]{4}$", result);
    }

    [Theory]
    [InlineData(null, null, "dev_")]
    [InlineData("", "", "dev_")]
    [InlineData("   ", "   ", "dev_")]
    public void GenerateUsername_WithNoNames_FallsBackToDev(string givenName, string familyName, string expectedPrefix)
    {
        string result = GiteaDbStudioOidcUsernameProvider.GenerateUsername(givenName, familyName);

        Assert.StartsWith(expectedPrefix, result);
    }

    [Theory]
    [InlineData("Ole", null, "ole_")]
    [InlineData("Ole", "", "ole_")]
    public void GenerateUsername_WithOnlyGivenName_UsesGivenName(
        string givenName,
        string familyName,
        string expectedPrefix
    )
    {
        string result = GiteaDbStudioOidcUsernameProvider.GenerateUsername(givenName, familyName);

        Assert.StartsWith(expectedPrefix, result);
    }

    [Theory]
    [InlineData(null, "Hansen", "hansen_")]
    [InlineData("", "Hansen", "hansen_")]
    public void GenerateUsername_WithOnlyFamilyName_UsesFamilyName(
        string givenName,
        string familyName,
        string expectedPrefix
    )
    {
        string result = GiteaDbStudioOidcUsernameProvider.GenerateUsername(givenName, familyName);

        Assert.StartsWith(expectedPrefix, result);
    }

    [Fact]
    public void GenerateUsername_WithVeryLongNames_RespectedGiteaLimit()
    {
        string givenName = "DEDIKERT MUNTER FLAMME FISKEBUTIKK";
        string familyName = "LANGANSEN VESTENSEN NORDANSEN";

        string result = GiteaDbStudioOidcUsernameProvider.GenerateUsername(givenName, familyName);

        Assert.True(result.Length <= 40, $"Username '{result}' exceeds Gitea's 40 char limit (was {result.Length})");
        Assert.Matches("[a-z0-9]{4}$", result);
    }

    [Fact]
    public void GenerateUsername_AlwaysEndsWithRandomSuffix()
    {
        string result1 = GiteaDbStudioOidcUsernameProvider.GenerateUsername("Ole", "Hansen");
        string result2 = GiteaDbStudioOidcUsernameProvider.GenerateUsername("Ole", "Hansen");

        Assert.NotEqual(result1, result2);
        Assert.Equal("ole_hansen_", result1[..11]);
        Assert.Equal("ole_hansen_", result2[..11]);
    }

    [Theory]
    [InlineData("123", "456", "dev_")]
    [InlineData("!!!", "???", "dev_")]
    public void GenerateUsername_WithOnlyNonAlphaChars_FallsBackToDev(
        string givenName,
        string familyName,
        string expectedPrefix
    )
    {
        string result = GiteaDbStudioOidcUsernameProvider.GenerateUsername(givenName, familyName);

        Assert.StartsWith(expectedPrefix, result);
    }

    [Fact]
    public void GenerateUsername_WithMultipleSpaces_NormalizesToSingleUnderscore()
    {
        string result = GiteaDbStudioOidcUsernameProvider.GenerateUsername("OLE  BJØRN", "HANSEN   BERG");

        Assert.StartsWith("ole_bjorn_hansen_berg_", result);
    }

    [Fact]
    public void GenerateUsername_LengthIs33ForMaxPrefix()
    {
        // maxPrefixLength = 40 - 1 - 4 = 35, so prefix can be up to 35 chars
        string givenName = "abcdefghijklmnopqrstuvwxyz";
        string familyName = "abcdefghijklmnopqrstuvwxyz";

        string result = GiteaDbStudioOidcUsernameProvider.GenerateUsername(givenName, familyName);

        Assert.True(result.Length <= 40, $"Username '{result}' exceeds 40 chars (was {result.Length})");
    }

    [Fact]
    public void GenerateUsername_TruncationDoesNotEndWithUnderscore()
    {
        // Create a name where truncation would land on an underscore
        string givenName = "abcdefghijklmnopqrstuvwxyzabcdefg";
        string familyName = "test";

        string result = GiteaDbStudioOidcUsernameProvider.GenerateUsername(givenName, familyName);

        // The prefix (before the last _suffix) should not end with underscore
        string prefixPart = result[..^5]; // remove _xxxx
        Assert.False(prefixPart.EndsWith('_'), $"Prefix '{prefixPart}' should not end with underscore");
        Assert.True(result.Length <= 40);
    }
}

using Altinn.Studio.Designer.Helpers;
using Xunit;

namespace Designer.Tests.Helpers;

public class GiteaUsernameGeneratorTests
{
    [Theory]
    [InlineData("ttd", "deploy", "bot_ttd_deploy_")]
    [InlineData("ttd", "ci_bot", "bot_ttd_ci_bot_")]
    [InlineData("TTD", "Deploy", "bot_ttd_deploy_")]
    public void GenerateBotUsername_WithOrgAndName_ContainsBoth(string org, string name, string expectedPrefix)
    {
        string result = GiteaUsernameGenerator.GenerateBotUsername(org, name);

        Assert.StartsWith(expectedPrefix, result);
        Assert.Matches("[a-z0-9]{4}$", result);
    }

    [Fact]
    public void GenerateBotUsername_WithDigitsInName_KeepsDigits()
    {
        string result = GiteaUsernameGenerator.GenerateBotUsername("ttd", "deploy_v2");

        Assert.StartsWith("bot_ttd_deploy_v2_", result);
    }

    [Fact]
    public void GenerateBotUsername_AlwaysEndsWithRandomSuffix()
    {
        string result1 = GiteaUsernameGenerator.GenerateBotUsername("ttd", "bot");
        string result2 = GiteaUsernameGenerator.GenerateBotUsername("ttd", "bot");

        Assert.NotEqual(result1, result2);
        Assert.Equal("bot_ttd_bot_", result1[..12]);
        Assert.Equal("bot_ttd_bot_", result2[..12]);
    }

    [Fact]
    public void GenerateBotUsername_WithVeryLongNames_RespectsGiteaLimit()
    {
        string result = GiteaUsernameGenerator.GenerateBotUsername("verylongorgname", "verylongbotname_with_extras");

        Assert.True(result.Length <= 40, $"Username '{result}' exceeds 40 char limit (was {result.Length})");
        Assert.Matches("[a-z0-9]{4}$", result);
    }

    [Fact]
    public void GenerateBotUsername_TruncationDoesNotEndWithUnderscore()
    {
        string result = GiteaUsernameGenerator.GenerateBotUsername("abcdefghijklmnopqrstuvwxyz", "test");

        string prefixPart = result[..^5];
        Assert.False(prefixPart.EndsWith('_'), $"Prefix '{prefixPart}' should not end with underscore");
        Assert.True(result.Length <= 40);
    }

    [Theory]
    [InlineData("ttd", "", "bot_ttd_")]
    [InlineData("ttd", "   ", "bot_ttd_")]
    public void GenerateBotUsername_WithEmptyName_UsesOrgOnly(string org, string name, string expectedPrefix)
    {
        string result = GiteaUsernameGenerator.GenerateBotUsername(org, name);

        Assert.StartsWith(expectedPrefix, result);
    }
}

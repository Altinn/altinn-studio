using Altinn.Studio.Preview.Files;

namespace Altinn.Studio.Preview.Tests.Files;

public sealed class WorkingCopyTests
{
    [Theory]
    [InlineData("developer", "ttd", "my-app")]
    [InlineData("Dev.Eloper_1", "ttd-test", "a1b")]
    [InlineData("d", "o", "abc")]
    public void TryCreate_AcceptsDesignerAndGiteaNames(string developer, string org, string app)
    {
        Assert.True(WorkingCopy.TryCreate(developer, org, app, out WorkingCopy? workingCopy));
        Assert.Equal((developer, org, app), (workingCopy.Developer, workingCopy.Org, workingCopy.App));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(".")]
    [InlineData("..")]
    [InlineData(".hidden")]
    [InlineData("trailing-")]
    [InlineData("a/b")]
    [InlineData("a\\b")]
    [InlineData("a b")]
    [InlineData("a\0b")]
    [InlineData("averyveryveryveryveryveryveryverylongname")]
    public void TryCreate_RefusesDeveloperOrOrgThatIsNotOneSafeSegment(string? name)
    {
        Assert.False(WorkingCopy.TryCreate(name, "ttd", "my-app", out _));
        Assert.False(WorkingCopy.TryCreate("developer", name, "my-app", out _));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("ab")]
    [InlineData("My-app")]
    [InlineData("1app")]
    [InlineData("app-")]
    [InlineData("..")]
    [InlineData("my.app")]
    [InlineData("an-app-name-that-is-far-too-long")]
    public void TryCreate_RefusesAppThatDesignerWouldNotName(string? app)
    {
        Assert.False(WorkingCopy.TryCreate("developer", "ttd", app, out _));
    }
}

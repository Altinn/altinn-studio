using Altinn.Studio.Gateway.Api.Application;

namespace Altinn.Studio.Gateway.Api.Tests;

public sealed class AppNameTests
{
    [Theory]
    [InlineData("a")]
    [InlineData("my-app")]
    [InlineData("app-")]
    [InlineData("a1b2")]
    public void Accepts_StudioAppNames(string app) => Assert.True(AppName.IsValid(app));

    [Theory]
    [InlineData("")]
    [InlineData("My-App")] // uppercase
    [InlineData("1app")] // must start with a letter
    [InlineData("-app")]
    [InlineData("my app")]
    [InlineData("my_app")]
    [InlineData("my-app\n")] // $ admits a trailing newline; \z must not
    [InlineData("my-app\r\n")]
    public void Rejects_EverythingElse(string app) => Assert.False(AppName.IsValid(app));

    [Fact]
    public void Rejects_NamesLongerThan63Characters()
    {
        Assert.True(AppName.IsValid("a" + new string('b', 62)));
        Assert.False(AppName.IsValid("a" + new string('b', 63)));
    }
}

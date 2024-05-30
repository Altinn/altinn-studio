#nullable disable
using Altinn.App.Core.Models;
using FluentAssertions;

#pragma warning disable CA1806 // Do not ignore method results

namespace Altinn.App.PlatformServices.Tests.Models;

public class AppIdentifierTests
{
    [Fact]
    public void Constructor_AppId_ShouldReturnValidInstance()
    {
        var org = "ttd";
        var app = "test-app";
        var appId = $"{org}/{app}";

        var appIdentifier = new AppIdentifier(appId);

        appIdentifier.Org.Should().Be(org);
        appIdentifier.App.Should().Be(app);
        appIdentifier.ToString().Should().Be(appId);
    }

    [Theory]
    [InlineData("ttd//test-app")]
    [InlineData("ttd\\test-app")]
    [InlineData("test-app")]
    public void Constructor_AppId_ShouldThrowException(string appId)
    {
        Action action = () => new AppIdentifier(appId);

        action.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Constructor_OrgApp_ShouldReturnValidInstance()
    {
        var org = "ttd";
        var app = "test-app";
        var appId = $"{org}/{app}";

        var appIdentifier = new AppIdentifier(org, app);

        appIdentifier.Org.Should().Be(org);
        appIdentifier.App.Should().Be(app);
        appIdentifier.ToString().Should().Be(appId);
    }

    [Theory]
    [InlineData("ttd", null)]
    [InlineData(null, "test-app")]
    public void Constructor_Null_ShouldThrowException(string org, string app)
    {
        Action action = () => new AppIdentifier(org, app);

        action.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_NullAppId_ShouldThrowException()
    {
        Action action = () => new AppIdentifier((string)null);

        action.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Constructor_Equals_ShouldBeEqual()
    {
        var org = "ttd";
        var app = "test-app";

        var appIdentifier1 = new AppIdentifier(org, app);
        var appIdentifier2 = new AppIdentifier(org, app);

        appIdentifier1.Should().BeEquivalentTo(appIdentifier2);
        appIdentifier1.GetHashCode().Should().Be(appIdentifier2.GetHashCode());
    }

    [Theory]
    [InlineData(
        "https://dihe.apps.tt02.altinn.no/dihe/redusert-foreldrebetaling-bhg/api/v1/eventsreceiver?code=16eda4f0-653a-4fdc-b516-c4702392a4eb",
        "dihe",
        "redusert-foreldrebetaling-bhg"
    )]
    public void CreateFromUrl_ValidUrl_ShouldConstruct(string url, string expectedOrg, string expectedApp)
    {
        AppIdentifier appIdentifier = AppIdentifier.CreateFromUrl(url);

        appIdentifier.Org.Should().Be(expectedOrg);
        appIdentifier.App.Should().Be(expectedApp);
    }

    [Theory]
    [InlineData("https://dihe.apps.tt02.altinn.no/dihe")]
    [InlineData("dihe/redusert-foreldrebetaling-bhg")]
    public void CreateFromUrl_InvalidUrl_ShouldThrowArgumentException(string url)
    {
        Action action = () => AppIdentifier.CreateFromUrl(url);

        action.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void CreateFromUrl_Null_ShouldThrowArgumentNullException()
    {
        Action action = () => AppIdentifier.CreateFromUrl(null);

        action.Should().Throw<ArgumentNullException>();
    }
}

#pragma warning restore CA1806 // Do not ignore method results

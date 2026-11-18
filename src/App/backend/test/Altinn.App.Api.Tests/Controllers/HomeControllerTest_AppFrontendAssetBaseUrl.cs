using System.Net;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class HomeControllerTest_AppFrontendAssetBaseUrl : ApiTestBase
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";

    public HomeControllerTest_AppFrontendAssetBaseUrl(ITestOutputHelper outputHelper)
        : base(outputHelper)
    {
        OverrideEnvironment = Environments.Development;
        SendAsync = _ =>
            Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("""{"orgs":{}}""") }
            );
    }

    [Fact]
    public async Task Index_UsesAppFrontendAssetBaseUrlAppSetting()
    {
        OverrideAppSetting("AppSettings:AppFrontendAssetBaseUrl", "/configured/frontend/");

        using var client = GetRootedClient(Org, App, configureServices: ConfigureStatelessAnonymousApp);
        using var response = await client.GetAsync($"{Org}/{App}/");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("href=\"/configured/frontend/altinn-app-frontend.css\"", html);
        Assert.Contains("src=\"/configured/frontend/altinn-app-frontend.js\" crossorigin></script>", html);
    }

    [Fact]
    public async Task Index_UsesBundledAppFrontendByDefault()
    {
        using var client = GetRootedClient(Org, App, configureServices: ConfigureStatelessAnonymousApp);
        using var response = await client.GetAsync($"{Org}/{App}/");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains($"href=\"/{Org}/{App}/altinn-app-frontend/altinn-app-frontend.css\"", html);
        Assert.Contains($"src=\"/{Org}/{App}/altinn-app-frontend/altinn-app-frontend.js\"", html);
        Assert.DoesNotContain("loading our built-in frontend is not yet supported", html);
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Staging")]
    public async Task Index_UsesFrontendVersionQueryParameterInDevelopmentAndTestEnvironments(string environment)
    {
        OverrideAppSetting("AppSettings:AppFrontendAssetBaseUrl", "/configured/frontend/");

        using var client = GetRootedClient(
            Org,
            App,
            configureServices: services => ConfigureStatelessAnonymousApp(services, environment)
        );
        using var response = await client.GetAsync($"{Org}/{App}/?frontendVersion=9.0.0-preview.6");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(
            "href=\"https://altinn.studio/designer/app-dist/9.0.0-preview.6/altinn-app-frontend.css\"",
            html
        );
        // Without crossorigin, because app-dist sends no CORS headers.
        Assert.Contains(
            "src=\"https://altinn.studio/designer/app-dist/9.0.0-preview.6/altinn-app-frontend.js\"></script>",
            html
        );
    }

    [Fact]
    public async Task Index_IgnoresFrontendVersionQueryParameterInProduction()
    {
        using var client = GetRootedClient(
            Org,
            App,
            configureServices: services => ConfigureStatelessAnonymousApp(services, Environments.Production)
        );
        using var response = await client.GetAsync($"{Org}/{App}/?frontendVersion=9.0.0-preview.6");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains($"src=\"/{Org}/{App}/altinn-app-frontend/altinn-app-frontend.js\"", html);
        Assert.DoesNotContain("app-dist", html);
    }

    [Theory]
    [InlineData("https://evil.example/x")]
    [InlineData("%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E")]
    public async Task Index_IgnoresFrontendVersionQueryParameterThatIsNotAVersion(string frontendVersion)
    {
        using var client = GetRootedClient(Org, App, configureServices: ConfigureStatelessAnonymousApp);
        using var response = await client.GetAsync($"{Org}/{App}/?frontendVersion={frontendVersion}");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains($"src=\"/{Org}/{App}/altinn-app-frontend/altinn-app-frontend.js\"", html);
        Assert.DoesNotContain("evil.example", html);
        Assert.DoesNotContain("<script>alert(1)", html);
    }

    [Theory]
    [InlineData("frontendVersion=9.0.0-preview.6&frontendVersion=")]
    [InlineData("frontendVersion=9.0.0-preview.6&frontendVersion=9.0.0-preview.7")]
    public async Task Index_IgnoresRepeatedFrontendVersionQueryParameter(string query)
    {
        using var client = GetRootedClient(Org, App, configureServices: ConfigureStatelessAnonymousApp);
        using var response = await client.GetAsync($"{Org}/{App}/?{query}");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains($"src=\"/{Org}/{App}/altinn-app-frontend/altinn-app-frontend.js\"", html);
        Assert.DoesNotContain("app-dist", html);
    }

    private static void ConfigureStatelessAnonymousApp(IServiceCollection services) =>
        ConfigureStatelessAnonymousApp(services, Environments.Development);

    private static void ConfigureStatelessAnonymousApp(IServiceCollection services, string environment)
    {
        var webHostEnvironmentMock = new Mock<IWebHostEnvironment>();
        webHostEnvironmentMock.SetupGet(e => e.EnvironmentName).Returns(environment);
        webHostEnvironmentMock.SetupGet(e => e.ApplicationName).Returns("Altinn.App.Api");
        webHostEnvironmentMock.SetupGet(e => e.ContentRootPath).Returns(Directory.GetCurrentDirectory());
        webHostEnvironmentMock
            .SetupGet(e => e.WebRootPath)
            .Returns(Path.Join(Directory.GetCurrentDirectory(), "wwwroot"));
        webHostEnvironmentMock.SetupGet(e => e.ContentRootFileProvider).Returns(new NullFileProvider());
        webHostEnvironmentMock.SetupGet(e => e.WebRootFileProvider).Returns(new NullFileProvider());
        services.Replace(ServiceDescriptor.Singleton(webHostEnvironmentMock.Object));

        services.AddSingleton(
            AppFilesMutationHook.ApplicationMetadata(appMetadata =>
            {
                appMetadata.OnEntry = new OnEntry { Show = "Task_1" };
                appMetadata.DataTypes.Find(d => d.Id == "default")!.AppLogic!.AllowAnonymousOnStateless = true;
            })
        );
    }
}

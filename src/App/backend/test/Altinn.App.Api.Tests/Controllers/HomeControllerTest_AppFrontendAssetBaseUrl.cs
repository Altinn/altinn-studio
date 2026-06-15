using System.Net;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class HomeControllerTest_AppFrontendAssetBaseUrl : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const string GeneratedOrg = "xunit";
    private const string GeneratedApp = "test-app";

    public HomeControllerTest_AppFrontendAssetBaseUrl(
        WebApplicationFactory<Program> factory,
        ITestOutputHelper outputHelper
    )
        : base(factory, outputHelper)
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
        Assert.Contains("src=\"/configured/frontend/altinn-app-frontend.js\"", html);
    }

    [Fact]
    public async Task Index_UsesBundledAppFrontendByDefault()
    {
        using var client = GetRootedClient(Org, App, configureServices: ConfigureStatelessAnonymousApp);
        using var response = await client.GetAsync($"{Org}/{App}/");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains($"href=\"/{GeneratedOrg}/{GeneratedApp}/altinn-app-frontend/altinn-app-frontend.css\"", html);
        Assert.Contains($"src=\"/{GeneratedOrg}/{GeneratedApp}/altinn-app-frontend/altinn-app-frontend.js\"", html);
        Assert.DoesNotContain("loading our built-in frontend is not yet supported", html);
    }

    private static void ConfigureStatelessAnonymousApp(IServiceCollection services)
    {
        var webHostEnvironmentMock = new Mock<IWebHostEnvironment>();
        webHostEnvironmentMock.SetupGet(e => e.EnvironmentName).Returns(Environments.Development);
        webHostEnvironmentMock.SetupGet(e => e.ApplicationName).Returns("Altinn.App.Api");
        webHostEnvironmentMock.SetupGet(e => e.ContentRootPath).Returns(Directory.GetCurrentDirectory());
        webHostEnvironmentMock
            .SetupGet(e => e.WebRootPath)
            .Returns(Path.Join(Directory.GetCurrentDirectory(), "wwwroot"));
        webHostEnvironmentMock.SetupGet(e => e.ContentRootFileProvider).Returns(new NullFileProvider());
        webHostEnvironmentMock.SetupGet(e => e.WebRootFileProvider).Returns(new NullFileProvider());
        services.Replace(ServiceDescriptor.Singleton(webHostEnvironmentMock.Object));

        services.AddSingleton(
            new AppMetadataMutationHook(appMetadata =>
            {
                appMetadata.OnEntry = new OnEntry { Show = "Task_1" };
                appMetadata.DataTypes.Find(d => d.Id == "default")!.AppLogic!.AllowAnonymousOnStateless = true;
            })
        );
    }
}

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AppLibVersionServiceTests
{
    private const string Org = "ttd";
    private const string Env = "tt02";

    private readonly Mock<IAppResourcesService> _appResourcesService = new();
    private readonly AppLibVersionService _service;

    public AppLibVersionServiceTests()
    {
        _service = new AppLibVersionService(_appResourcesService.Object, new MemoryCache(new MemoryCacheOptions()));
    }

    [Fact]
    public async Task GetAppLibVersions_ReadsTheVersionEachAppReports_AndLeavesOutAppsThatDoNotAnswer()
    {
        SetUpVersion("app-one", "8.5.3.108");
        SetUpVersion("app-without-version", null);
        _appResourcesService
            .Setup(s => s.GetApplicationMetadata(Org, Env, "app-down", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("app is unreachable"));

        IReadOnlyDictionary<string, string> versions = await _service.GetAppLibVersions(
            Org,
            Env,
            [new AppImage("app-one", "1"), new AppImage("app-without-version", "2"), new AppImage("app-down", "3")],
            CancellationToken.None
        );

        Assert.Equal("8.5.3", versions["app-one"]);
        Assert.Null(versions["app-without-version"]);
        Assert.Null(versions["app-down"]);
    }

    [Fact]
    public async Task GetAppLibVersions_AsksAnAppAgainOnlyWhenItRunsAnotherImage()
    {
        SetUpVersion("app-one", "8.5.3.108");

        await _service.GetAppLibVersions(Org, Env, [new AppImage("app-one", "1")], CancellationToken.None);
        await _service.GetAppLibVersions(Org, Env, [new AppImage("app-one", "1")], CancellationToken.None);
        SetUpVersion("app-one", "8.6.0.1");
        var afterDeploy = await _service.GetAppLibVersions(
            Org,
            Env,
            [new AppImage("app-one", "2")],
            CancellationToken.None
        );

        Assert.Equal("8.6.0", afterDeploy["app-one"]);
        _appResourcesService.Verify(
            s => s.GetApplicationMetadata(Org, Env, "app-one", It.IsAny<CancellationToken>()),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task GetAppLibVersions_AsksAgainForAnAppWhoseImageIsNotKnown()
    {
        SetUpVersion("app-one", "8.5.3.108");

        await _service.GetAppLibVersions(Org, Env, [new AppImage("app-one", null)], CancellationToken.None);
        await _service.GetAppLibVersions(Org, Env, [new AppImage("app-one", null)], CancellationToken.None);

        _appResourcesService.Verify(
            s => s.GetApplicationMetadata(Org, Env, "app-one", It.IsAny<CancellationToken>()),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task GetAppLibVersions_DoesNotKeepAMissingVersion()
    {
        _appResourcesService
            .SetupSequence(s => s.GetApplicationMetadata(Org, Env, "app-one", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("app is starting"))
            .ReturnsAsync(new ApplicationMetadata($"{Org}/app-one") { AltinnNugetVersion = "9.0.0.175" });

        await _service.GetAppLibVersions(Org, Env, [new AppImage("app-one", "1")], CancellationToken.None);
        var versions = await _service.GetAppLibVersions(
            Org,
            Env,
            [new AppImage("app-one", "1")],
            CancellationToken.None
        );

        Assert.Equal("9.0.0", versions["app-one"]);
    }

    private void SetUpVersion(string app, string altinnNugetVersion) =>
        _appResourcesService
            .Setup(s => s.GetApplicationMetadata(Org, Env, app, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ApplicationMetadata($"{Org}/{app}") { AltinnNugetVersion = altinnNugetVersion });
}

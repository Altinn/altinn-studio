#nullable enable
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class DeployWarningsServiceTests
{
    private const string Org = "ttd";
    private const string App = "deploy-warnings";
    private const string TagName = "2.0";
    private const string Commit = "c0ffee";
    private const string Production = "production";
    private const string TestEnvironment = "tt02";

    private readonly Mock<IReleaseRepository> _releaseRepository = new();
    private readonly Mock<IGiteaClient> _giteaClient = new();
    private readonly Mock<IAppResourcesService> _appResourcesService = new();
    private readonly Mock<IEnvironmentsService> _environmentsService = new();
    private readonly FakeTimeProvider _timeProvider = new();

    public DeployWarningsServiceTests()
    {
        _releaseRepository
            .Setup(repository =>
                repository.Get(Org, App, TagName, null, It.Is<List<string>>(results => results.Contains("succeeded")))
            )
            .ReturnsAsync([new ReleaseEntity { TagName = TagName, TargetCommitish = Commit }]);
        _environmentsService
            .Setup(service => service.GetEnvironments())
            .ReturnsAsync([
                new EnvironmentModel { Name = Production, Type = "production" },
                new EnvironmentModel { Name = TestEnvironment, Type = "test" },
            ]);
    }

    [Fact]
    public async Task Get_ComparesTheReleasesProjectFileWithTheRunningApp()
    {
        SetupReleaseCsproj(PackageReference("9.0.0-preview.10"));
        SetupEnvironmentVersion(Production, "8.7.2.0");

        DeployWarnings? warnings = await CreateService().Get(Org, App, TagName, Production, CancellationToken.None);

        Assert.NotNull(warnings);
        Assert.Equal([DeployWarning.UpgradeToV9, DeployWarning.PrereleaseToProduction], warnings.Warnings);
        Assert.Equal("9.0.0-preview.10", warnings.ReleaseAppLibVersion);
        Assert.Equal("8.7.2", warnings.EnvironmentAppLibVersion);
    }

    [Fact]
    public async Task Get_SameMajorOnBothSides_GivesNoWarning()
    {
        SetupReleaseCsproj(PackageReference("8.7.2"));
        SetupEnvironmentVersion(Production, "8.6.1.0");

        DeployWarnings? warnings = await CreateService().Get(Org, App, TagName, Production, CancellationToken.None);

        Assert.NotNull(warnings);
        Assert.Empty(warnings.Warnings);
    }

    [Fact]
    public async Task Get_TestEnvironment_DoesNotWarnAboutAPrerelease()
    {
        SetupReleaseCsproj(PackageReference("9.0.0-preview.10"));
        SetupEnvironmentVersion(TestEnvironment, "9.0.0.0");

        DeployWarnings? warnings = await CreateService()
            .Get(Org, App, TagName, TestEnvironment, CancellationToken.None);

        Assert.NotNull(warnings);
        Assert.Empty(warnings.Warnings);
    }

    [Fact]
    public async Task Get_ExperimentalPackage_IsTheAppLibraries()
    {
        SetupReleaseCsproj(PackageReference("8.7.2", "Altinn.App.Api.Experimental"));
        SetupEnvironmentVersion(Production, "9.0.0.0");

        DeployWarnings? warnings = await CreateService().Get(Org, App, TagName, Production, CancellationToken.None);

        Assert.NotNull(warnings);
        Assert.Equal([DeployWarning.RollbackFromV9], warnings.Warnings);
    }

    [Fact]
    public async Task Get_VersionNotALiteralInTheProjectFile_GivesNoWarningThatNeedsIt()
    {
        SetupReleaseCsproj(PackageReference("$(AltinnAppVersion)"));
        SetupEnvironmentVersion(Production, "8.7.2.0");

        DeployWarnings? warnings = await CreateService().Get(Org, App, TagName, Production, CancellationToken.None);

        Assert.NotNull(warnings);
        Assert.Empty(warnings.Warnings);
        Assert.Null(warnings.ReleaseAppLibVersion);
        Assert.Equal("8.7.2", warnings.EnvironmentAppLibVersion);
    }

    [Fact]
    public async Task Get_NoProjectFileAtTheCommit_GivesNoWarningThatNeedsIt()
    {
        _giteaClient
            .Setup(client => client.GetFileAsync(Org, App, "App/App.csproj", Commit, It.IsAny<CancellationToken>()))
            .ReturnsAsync((FileSystemObject?)null);
        SetupEnvironmentVersion(Production, "9.0.0.0");

        DeployWarnings? warnings = await CreateService().Get(Org, App, TagName, Production, CancellationToken.None);

        Assert.NotNull(warnings);
        Assert.Empty(warnings.Warnings);
        Assert.Null(warnings.ReleaseAppLibVersion);
    }

    [Fact]
    public async Task Get_GiteaFails_GivesNoWarningThatNeedsTheReleaseVersion()
    {
        _giteaClient
            .Setup(client => client.GetFileAsync(Org, App, "App/App.csproj", Commit, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Gitea is down"));
        SetupEnvironmentVersion(Production, "9.0.0.0");

        DeployWarnings? warnings = await CreateService().Get(Org, App, TagName, Production, CancellationToken.None);

        Assert.NotNull(warnings);
        Assert.Empty(warnings.Warnings);
    }

    [Fact]
    public async Task Get_ProjectFileThatIsNotXml_GivesNoWarningThatNeedsIt()
    {
        SetupReleaseCsproj("<Project");
        SetupEnvironmentVersion(Production, "8.7.2.0");

        DeployWarnings? warnings = await CreateService().Get(Org, App, TagName, Production, CancellationToken.None);

        Assert.NotNull(warnings);
        Assert.Empty(warnings.Warnings);
    }

    [Fact]
    public async Task Get_AppDoesNotAnswer_StillWarnsAboutAPrereleaseToProduction()
    {
        SetupReleaseCsproj(PackageReference("9.0.0-preview.10"));
        _appResourcesService
            .Setup(service => service.GetApplicationMetadata(Org, Production, App, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("Not found"));

        DeployWarnings? warnings = await CreateService().Get(Org, App, TagName, Production, CancellationToken.None);

        Assert.NotNull(warnings);
        Assert.Equal([DeployWarning.PrereleaseToProduction], warnings.Warnings);
        Assert.Null(warnings.EnvironmentAppLibVersion);
    }

    [Fact]
    public async Task Get_AppThatHangs_IsGivenUpOnAfterATimeout()
    {
        SetupReleaseCsproj(PackageReference("9.0.0"));
        _appResourcesService
            .Setup(service => service.GetApplicationMetadata(Org, Production, App, It.IsAny<CancellationToken>()))
            .Returns(
                async (string _, string _, string _, CancellationToken cancellationToken) =>
                {
                    await Task.Delay(Timeout.Infinite, cancellationToken);
                    return new ApplicationMetadata($"{Org}/{App}");
                }
            );

        Task<DeployWarnings?> pending = CreateService().Get(Org, App, TagName, Production, CancellationToken.None);
        Assert.False(pending.IsCompleted);
        _timeProvider.Advance(TimeSpan.FromSeconds(5));
        DeployWarnings? warnings = await pending;

        Assert.NotNull(warnings);
        Assert.Empty(warnings.Warnings);
        Assert.Null(warnings.EnvironmentAppLibVersion);
    }

    [Fact]
    public async Task Get_CallerCancels_IsCancelled()
    {
        SetupReleaseCsproj(PackageReference("9.0.0"));
        _appResourcesService
            .Setup(service => service.GetApplicationMetadata(Org, Production, App, It.IsAny<CancellationToken>()))
            .Returns(
                async (string _, string _, string _, CancellationToken cancellationToken) =>
                {
                    await Task.Delay(Timeout.Infinite, cancellationToken);
                    return new ApplicationMetadata($"{Org}/{App}");
                }
            );
        using var cancellation = new CancellationTokenSource();

        Task<DeployWarnings?> pending = CreateService().Get(Org, App, TagName, Production, cancellation.Token);
        await cancellation.CancelAsync();

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => pending);
    }

    [Fact]
    public async Task Get_NoSucceededReleaseWithTheTag_ReturnsNull()
    {
        DeployWarnings? warnings = await CreateService()
            .Get(Org, App, "no-such-tag", Production, CancellationToken.None);

        Assert.Null(warnings);
    }

    [Fact]
    public async Task Get_UnknownEnvironment_ReturnsNull()
    {
        DeployWarnings? warnings = await CreateService().Get(Org, App, TagName, "at99", CancellationToken.None);

        Assert.Null(warnings);
    }

    private DeployWarningsService CreateService() =>
        new(
            _releaseRepository.Object,
            _giteaClient.Object,
            _appResourcesService.Object,
            _environmentsService.Object,
            _timeProvider,
            NullLogger<DeployWarningsService>.Instance
        );

    private static string PackageReference(string version, string packageName = "Altinn.App.Api") =>
        $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="{packageName}" Version="{version}" />
              </ItemGroup>
            </Project>
            """;

    private void SetupReleaseCsproj(string content) =>
        _giteaClient
            .Setup(client => client.GetFileAsync(Org, App, "App/App.csproj", Commit, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FileSystemObject { Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)) });

    private void SetupEnvironmentVersion(string environment, string altinnNugetVersion) =>
        _appResourcesService
            .Setup(service => service.GetApplicationMetadata(Org, environment, App, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ApplicationMetadata($"{Org}/{App}") { AltinnNugetVersion = altinnNugetVersion });
}

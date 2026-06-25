using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.Models;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Repository.Models.AppScope;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;
using Altinn.Studio.Designer.ViewModels.Request;
using Altinn.Studio.Designer.ViewModels.Response;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Rest.TransientFaultHandling;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Services;

public class ReleaseServiceTest
{
    private readonly Mock<IHttpContextAccessor> _httpContextAccessor;
    private readonly Mock<IReleaseRepository> _releaseRepository;
    private readonly Mock<IAppScopesService> _appScopesService;
    private readonly Mock<IGiteaClient> _giteaClient;
    private readonly Mock<IAzureDevOpsBuildClient> _azureDevOpsBuildClient;
    private readonly Mock<IApiKeyService> _apiKeyService;
    private readonly Mock<ILogger<ReleaseService>> _logger;
    private readonly GeneralSettings _generalSettings;
    private readonly string _org = "udi";
    private readonly string _app = "kjaerestebesok";
    private const string ExpectedDefaultMaskinportenScopes =
        "[\"altinn:serviceowner\",\"altinn:serviceowner/instances.read\",\"altinn:serviceowner/instances.write\"]";
    private static readonly List<string> ExpectedDefaultMaskinportenScopeList =
    [
        DefaultMaskinportenScopes.ServiceOwner,
        DefaultMaskinportenScopes.ServiceOwnerInstancesRead,
        DefaultMaskinportenScopes.ServiceOwnerInstancesWrite,
    ];

    public ReleaseServiceTest()
    {
        _httpContextAccessor = AuthenticationUtil.GetAuthenticatedHttpContextAccessor();
        _releaseRepository = new Mock<IReleaseRepository>();
        _appScopesService = new Mock<IAppScopesService>();
        _giteaClient = new Mock<IGiteaClient>();
        _azureDevOpsBuildClient = new Mock<IAzureDevOpsBuildClient>();
        _apiKeyService = new Mock<IApiKeyService>();
        _logger = new Mock<ILogger<ReleaseService>>();
        _generalSettings = new GeneralSettings();

        _giteaClient
            .Setup(c =>
                c.GetFileAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((FileSystemObject)null);
    }

    [Fact]
    public async Task CreateAsync_OK()
    {
        // Arrange
        ReleaseEntity releaseEntity = new()
        {
            TagName = "1",
            Name = "1",
            Body = "test-app",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Org = _org,
            App = _app,
        };

        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult))
            .ReturnsAsync(new List<ReleaseEntity>());
        _releaseRepository
            .Setup(r => r.Create(It.IsAny<ReleaseEntity>()))
            .ReturnsAsync(GetReleases("createdRelease.json").First());

        _azureDevOpsBuildClient
            .Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(GetBuild());
        _appScopesService
            .Setup(r =>
                r.GetAppScopesAsync(It.IsAny<AltinnRepoContext>(), It.IsAny<System.Threading.CancellationToken>())
            )
            .ReturnsAsync((AppScopesEntity)null);

        ReleaseService releaseService = CreateReleaseService();

        // Act
        ReleaseEntity result = await releaseService.CreateAsync(releaseEntity);

        // Assert
        Assert.NotNull(result);

        var properties = result.GetType().GetProperties();
        foreach (var property in properties)
        {
            Assert.NotNull(property.GetValue(result));
        }

        _releaseRepository.Verify(
            r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult),
            Times.Once
        );
        _releaseRepository.Verify(r => r.Create(It.IsAny<ReleaseEntity>()), Times.Once);
        _azureDevOpsBuildClient.Verify(
            b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task CreateAsync_Exception()
    {
        // Arrange
        ReleaseEntity releaseEntity = new()
        {
            TagName = "1",
            Name = "1",
            Body = "test-app",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Org = _org,
            App = _app,
        };

        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult))
            .ReturnsAsync(GetReleases("createdRelease.json"));
        _appScopesService
            .Setup(r =>
                r.GetAppScopesAsync(It.IsAny<AltinnRepoContext>(), It.IsAny<System.Threading.CancellationToken>())
            )
            .ReturnsAsync((AppScopesEntity)null);

        ReleaseService releaseService = CreateReleaseService();

        // Act
        HttpRequestWithStatusException resultException = null;
        try
        {
            await releaseService.CreateAsync(releaseEntity);
        }
        catch (HttpRequestWithStatusException e)
        {
            resultException = e;
        }

        // Assert
        Assert.NotNull(resultException);
        Assert.Equal(HttpStatusCode.Conflict, resultException.StatusCode);
    }

    [Fact]
    public async Task GetAsync_OK()
    {
        // Arrange
        _releaseRepository
            .Setup(r => r.Get(_org, _app, It.IsAny<DocumentQueryModel>()))
            .ReturnsAsync(GetReleases("completedReleases.json"));

        ReleaseService releaseService = CreateReleaseService();

        // Act
        SearchResults<ReleaseEntity> results = await releaseService.GetAsync(_org, _app, new DocumentQueryModel());

        // Assert
        Assert.Equal(5, results.Results.Count());
        _releaseRepository.Verify(r => r.Get(_org, _app, It.IsAny<DocumentQueryModel>()), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_OK()
    {
        // Arrange
        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(GetReleases("createdRelease.json"));
        _releaseRepository.Setup(r => r.Update(It.IsAny<ReleaseEntity>())).Returns(Task.CompletedTask);

        ReleaseService releaseService = CreateReleaseService();

        _azureDevOpsBuildClient
            .Setup(adob => adob.Get(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(GetReleases("createdRelease.json").First().Build);

        // Act
        await releaseService.UpdateAsync(GetReleases("createdRelease.json").First().Build.Id, "ttd");

        // Assert
        _releaseRepository.Verify(r => r.Get(It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        _releaseRepository.Verify(r => r.Update(It.IsAny<ReleaseEntity>()), Times.Once);
    }

    private static List<ReleaseEntity> GetReleases(string filename)
    {
        string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(ReleaseServiceTest).Assembly.Location).LocalPath);
        string path = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "ReleasesCollection", filename);
        if (File.Exists(path))
        {
            string releases = File.ReadAllText(path);
            return JsonConvert.DeserializeObject<List<ReleaseEntity>>(releases);
        }

        return null;
    }

    private static Build GetBuild()
    {
        return new Build
        {
            Id = 1,
            Status = BuildStatus.None,
            StartTime = DateTime.Now,
        };
    }

    private static AzureDevOpsSettings GetAzureDevOpsSettings()
    {
        return new AzureDevOpsSettings
        {
            BaseUri = "https://dev.azure.com/brreg/altinn-studio/_apis/",
            BuildDefinitionId = 69,
            DeployDefinitionId = 81,
        };
    }

    private ReleaseService CreateReleaseService()
    {
        return new ReleaseService(
            _httpContextAccessor.Object,
            _azureDevOpsBuildClient.Object,
            _releaseRepository.Object,
            _appScopesService.Object,
            _giteaClient.Object,
            GetAzureDevOpsSettings(),
            _generalSettings,
            _apiKeyService.Object,
            TimeProvider.System,
            _logger.Object
        );
    }

    private void SetupAppLibVersion(string version)
    {
        string csprojContent = $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="{version}" />
              </ItemGroup>
            </Project>
            """;

        _giteaClient
            .Setup(c => c.GetFileAsync(_org, _app, "App/App.csproj", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new FileSystemObject { Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(csprojContent)) }
            );
    }

    private void VerifyWarningLog()
    {
        _logger.Verify(
            l =>
                l.Log(
                    LogLevel.Warning,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((_, _) => true),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task CreateAsync_WithAppScopes_PassesScopesToQueueBuildParameters()
    {
        // Arrange
        ReleaseEntity releaseEntity = new()
        {
            TagName = "1",
            Name = "1",
            Body = "test-app",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Org = _org,
            App = _app,
        };

        var appScopes = new AppScopesEntity
        {
            Org = _org,
            App = _app,
            Scopes = new HashSet<MaskinPortenScopeEntity>
            {
                new()
                {
                    Scope = DefaultMaskinportenScopes.ServiceOwner,
                    Description = "Brukes til å indikere at klienten er et tjenesteeiersystem.",
                },
                new()
                {
                    Scope = DefaultMaskinportenScopes.ServiceOwnerInstancesRead,
                    Description = "Klienter kan lese data knyttet til alle appene til tjenesteeieren.",
                },
                new()
                {
                    Scope = DefaultMaskinportenScopes.ServiceOwnerInstancesWrite,
                    Description = "Klienter kan skrive data for alle deres apper.",
                },
            },
        };

        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult))
            .ReturnsAsync(new List<ReleaseEntity>());
        _releaseRepository
            .Setup(r => r.Create(It.IsAny<ReleaseEntity>()))
            .ReturnsAsync(GetReleases("createdRelease.json").First());
        _appScopesService
            .Setup(r =>
                r.GetAppScopesAsync(It.IsAny<AltinnRepoContext>(), It.IsAny<System.Threading.CancellationToken>())
            )
            .ReturnsAsync(appScopes);
        _azureDevOpsBuildClient
            .Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(GetBuild());

        ReleaseService releaseService = CreateReleaseService();

        // Act
        await releaseService.CreateAsync(releaseEntity);

        // Assert
        _appScopesService.Verify(
            r =>
                r.AddDefaultMaskinportenScopesAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        _azureDevOpsBuildClient.Verify(
            b =>
                b.QueueAsync(
                    It.Is<QueueBuildParameters>(p => p.AppMaskinportenScopes == ExpectedDefaultMaskinportenScopes),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _releaseRepository.Verify(
            r =>
                r.Create(
                    It.Is<ReleaseEntity>(release =>
                        release.BuildInputs.MaskinportenScopes.SequenceEqual(ExpectedDefaultMaskinportenScopeList)
                    )
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task CreateAsync_WithEmptyAppScopes_PassesEmptyArray()
    {
        // Arrange
        ReleaseEntity releaseEntity = new()
        {
            TagName = "1",
            Name = "1",
            Body = "test-app",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Org = _org,
            App = _app,
        };

        var appScopes = new AppScopesEntity
        {
            Org = _org,
            App = _app,
            Scopes = new HashSet<MaskinPortenScopeEntity>(),
        };

        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult))
            .ReturnsAsync(new List<ReleaseEntity>());
        _releaseRepository
            .Setup(r => r.Create(It.IsAny<ReleaseEntity>()))
            .ReturnsAsync(GetReleases("createdRelease.json").First());
        _appScopesService
            .Setup(r =>
                r.GetAppScopesAsync(It.IsAny<AltinnRepoContext>(), It.IsAny<System.Threading.CancellationToken>())
            )
            .ReturnsAsync(appScopes);
        _azureDevOpsBuildClient
            .Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(GetBuild());

        ReleaseService releaseService = CreateReleaseService();

        // Act
        await releaseService.CreateAsync(releaseEntity);

        // Assert
        _appScopesService.Verify(
            r =>
                r.AddDefaultMaskinportenScopesAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        _azureDevOpsBuildClient.Verify(
            b =>
                b.QueueAsync(
                    It.Is<QueueBuildParameters>(p => p.AppMaskinportenScopes == "[]"),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _releaseRepository.Verify(
            r => r.Create(It.Is<ReleaseEntity>(release => release.BuildInputs.MaskinportenScopes.Count == 0)),
            Times.Once
        );
    }

    [Fact]
    public async Task CreateAsync_WithNullAppScopes_PassesEmptyArray()
    {
        // Arrange
        ReleaseEntity releaseEntity = new()
        {
            TagName = "1",
            Name = "1",
            Body = "test-app",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Org = _org,
            App = _app,
        };

        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult))
            .ReturnsAsync(new List<ReleaseEntity>());
        _releaseRepository
            .Setup(r => r.Create(It.IsAny<ReleaseEntity>()))
            .ReturnsAsync(GetReleases("createdRelease.json").First());
        _appScopesService
            .Setup(r =>
                r.GetAppScopesAsync(It.IsAny<AltinnRepoContext>(), It.IsAny<System.Threading.CancellationToken>())
            )
            .ReturnsAsync((AppScopesEntity)null);
        _azureDevOpsBuildClient
            .Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(GetBuild());

        ReleaseService releaseService = CreateReleaseService();

        // Act
        await releaseService.CreateAsync(releaseEntity);

        // Assert
        _appScopesService.Verify(
            r =>
                r.AddDefaultMaskinportenScopesAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        _azureDevOpsBuildClient.Verify(
            b =>
                b.QueueAsync(
                    It.Is<QueueBuildParameters>(p => p.AppMaskinportenScopes == "[]"),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _releaseRepository.Verify(
            r => r.Create(It.Is<ReleaseEntity>(release => release.BuildInputs.MaskinportenScopes.Count == 0)),
            Times.Once
        );
    }

    [Fact]
    public async Task CreateAsync_WithAppLibVersion9PreviewAndNullAppScopes_AddsDefaultMaskinportenScopes()
    {
        // Arrange
        ReleaseEntity releaseEntity = new()
        {
            TagName = "1",
            Name = "1",
            Body = "test-app",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Org = _org,
            App = _app,
        };

        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult))
            .ReturnsAsync(new List<ReleaseEntity>());
        _releaseRepository
            .Setup(r => r.Create(It.IsAny<ReleaseEntity>()))
            .ReturnsAsync(GetReleases("createdRelease.json").First());
        _appScopesService
            .Setup(r =>
                r.GetAppScopesAsync(It.IsAny<AltinnRepoContext>(), It.IsAny<System.Threading.CancellationToken>())
            )
            .ReturnsAsync((AppScopesEntity)null);
        var defaultAppScopes = new AppScopesEntity
        {
            Org = _org,
            App = _app,
            Scopes = new HashSet<MaskinPortenScopeEntity>
            {
                new() { Scope = DefaultMaskinportenScopes.ServiceOwner },
                new() { Scope = DefaultMaskinportenScopes.ServiceOwnerInstancesRead },
                new() { Scope = DefaultMaskinportenScopes.ServiceOwnerInstancesWrite },
            },
        };
        _appScopesService
            .Setup(r =>
                r.AddDefaultMaskinportenScopesAsync(It.IsAny<AltinnRepoEditingContext>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(defaultAppScopes);
        _azureDevOpsBuildClient
            .Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(GetBuild());
        SetupAppLibVersion("9.0.0-preview.1");

        ReleaseService releaseService = CreateReleaseService();

        // Act
        await releaseService.CreateAsync(releaseEntity);

        // Assert
        _appScopesService.Verify(
            r =>
                r.AddDefaultMaskinportenScopesAsync(
                    It.Is<AltinnRepoEditingContext>(context =>
                        context.Org == _org && context.Repo == _app && context.Developer == "testUser"
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _azureDevOpsBuildClient.Verify(
            b =>
                b.QueueAsync(
                    It.Is<QueueBuildParameters>(p =>
                        p.AppMaskinportenScopes.Contains(DefaultMaskinportenScopes.ServiceOwner)
                        && p.AppMaskinportenScopes.Contains(DefaultMaskinportenScopes.ServiceOwnerInstancesRead)
                        && p.AppMaskinportenScopes.Contains(DefaultMaskinportenScopes.ServiceOwnerInstancesWrite)
                    ),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task CreateAsync_WithAppLibVersion9AndExistingDefaultMaskinportenScopes_DoesNotAddDefaults()
    {
        // Arrange
        ReleaseEntity releaseEntity = new()
        {
            TagName = "1",
            Name = "1",
            Body = "test-app",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Org = _org,
            App = _app,
        };

        var appScopes = new AppScopesEntity
        {
            Org = _org,
            App = _app,
            Scopes = new HashSet<MaskinPortenScopeEntity>
            {
                new() { Scope = DefaultMaskinportenScopes.ServiceOwner },
                new() { Scope = DefaultMaskinportenScopes.ServiceOwnerInstancesRead },
                new() { Scope = DefaultMaskinportenScopes.ServiceOwnerInstancesWrite },
            },
        };

        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult))
            .ReturnsAsync(new List<ReleaseEntity>());
        _releaseRepository
            .Setup(r => r.Create(It.IsAny<ReleaseEntity>()))
            .ReturnsAsync(GetReleases("createdRelease.json").First());
        _appScopesService
            .Setup(r =>
                r.GetAppScopesAsync(It.IsAny<AltinnRepoContext>(), It.IsAny<System.Threading.CancellationToken>())
            )
            .ReturnsAsync(appScopes);
        _azureDevOpsBuildClient
            .Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(GetBuild());
        SetupAppLibVersion("9.0.0");

        ReleaseService releaseService = CreateReleaseService();

        // Act
        await releaseService.CreateAsync(releaseEntity);

        // Assert
        _appScopesService.Verify(
            r =>
                r.AddDefaultMaskinportenScopesAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task CreateAsync_WithAppLibVersion83AndNullAppScopes_PassesEmptyArray()
    {
        // Arrange
        ReleaseEntity releaseEntity = new()
        {
            TagName = "1",
            Name = "1",
            Body = "test-app",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Org = _org,
            App = _app,
        };

        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult))
            .ReturnsAsync(new List<ReleaseEntity>());
        _releaseRepository
            .Setup(r => r.Create(It.IsAny<ReleaseEntity>()))
            .ReturnsAsync(GetReleases("createdRelease.json").First());
        _appScopesService
            .Setup(r =>
                r.GetAppScopesAsync(It.IsAny<AltinnRepoContext>(), It.IsAny<System.Threading.CancellationToken>())
            )
            .ReturnsAsync((AppScopesEntity)null);
        _azureDevOpsBuildClient
            .Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(GetBuild());
        SetupAppLibVersion("8.3.0");

        ReleaseService releaseService = CreateReleaseService();

        // Act
        await releaseService.CreateAsync(releaseEntity);

        // Assert
        _appScopesService.Verify(
            r =>
                r.AddDefaultMaskinportenScopesAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        _azureDevOpsBuildClient.Verify(
            b =>
                b.QueueAsync(
                    It.Is<QueueBuildParameters>(p => p.AppMaskinportenScopes == "[]"),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task CreateAsync_WhenFetchingAppCsprojFails_PassesEmptyArray()
    {
        // Arrange
        ReleaseEntity releaseEntity = new()
        {
            TagName = "1",
            Name = "1",
            Body = "test-app",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Org = _org,
            App = _app,
        };

        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult))
            .ReturnsAsync(new List<ReleaseEntity>());
        _releaseRepository
            .Setup(r => r.Create(It.IsAny<ReleaseEntity>()))
            .ReturnsAsync(GetReleases("createdRelease.json").First());
        _appScopesService
            .Setup(r =>
                r.GetAppScopesAsync(It.IsAny<AltinnRepoContext>(), It.IsAny<System.Threading.CancellationToken>())
            )
            .ReturnsAsync((AppScopesEntity)null);
        _giteaClient
            .Setup(c => c.GetFileAsync(_org, _app, "App/App.csproj", It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IOException("Could not read file."));
        _azureDevOpsBuildClient
            .Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(GetBuild());

        ReleaseService releaseService = CreateReleaseService();

        // Act
        await releaseService.CreateAsync(releaseEntity);

        // Assert
        _appScopesService.Verify(
            r =>
                r.AddDefaultMaskinportenScopesAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
        _azureDevOpsBuildClient.Verify(
            b =>
                b.QueueAsync(
                    It.Is<QueueBuildParameters>(p => p.AppMaskinportenScopes == "[]"),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        VerifyWarningLog();
    }

    [Fact]
    public async Task CreateAsync_WithStudioOidcEnabled_UsesApiKeyAndAuthHeader()
    {
        // Arrange
        ReleaseEntity releaseEntity = new()
        {
            TagName = "1",
            Name = "1",
            Body = "test-app",
            TargetCommitish = "eec136ac2d31cf984d2053df79f181b99c3b4db5",
            Org = _org,
            App = _app,
        };

        List<string> buildStatus = new()
        {
            BuildStatus.InProgress.ToEnumMemberAttributeValue(),
            BuildStatus.NotStarted.ToEnumMemberAttributeValue(),
        };

        List<string> buildResult = new() { BuildResult.Succeeded.ToEnumMemberAttributeValue() };

        _releaseRepository
            .Setup(r => r.Get(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), buildStatus, buildResult))
            .ReturnsAsync(new List<ReleaseEntity>());
        _releaseRepository
            .Setup(r => r.Create(It.IsAny<ReleaseEntity>()))
            .ReturnsAsync(GetReleases("createdRelease.json").First());
        _appScopesService
            .Setup(r =>
                r.GetAppScopesAsync(It.IsAny<AltinnRepoContext>(), It.IsAny<System.Threading.CancellationToken>())
            )
            .ReturnsAsync((AppScopesEntity)null);
        _azureDevOpsBuildClient
            .Setup(b => b.QueueAsync(It.IsAny<QueueBuildParameters>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(GetBuild());

        string expectedApiKey = "generated-api-key";
        _apiKeyService
            .Setup(s =>
                s.CreateAsync(
                    It.IsAny<string>(),
                    It.Is<string>(n => n.StartsWith("release-")),
                    Altinn.Studio.Designer.Models.ApiKey.ApiKeyType.System,
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync((expectedApiKey, new Altinn.Studio.Designer.Models.ApiKey.ApiKey()));

        ReleaseService releaseService = CreateReleaseService();

        // Act
        await releaseService.CreateAsync(releaseEntity);

        // Assert
        _azureDevOpsBuildClient.Verify(
            b =>
                b.QueueAsync(
                    It.Is<QueueBuildParameters>(p =>
                        p.AppDeployToken == expectedApiKey && p.AppAuthHeaderName == "X-Api-Key"
                    ),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        _apiKeyService.Verify(
            s =>
                s.CreateAsync(
                    It.IsAny<string>(),
                    It.Is<string>(n => n.StartsWith("release-")),
                    Altinn.Studio.Designer.Models.ApiKey.ApiKeyType.System,
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }
}

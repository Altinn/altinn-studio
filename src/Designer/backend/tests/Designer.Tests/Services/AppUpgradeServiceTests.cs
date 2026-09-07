using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto.AppUpgrade;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine;
using Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AppUpgradeServiceTests
{
    private const string Org = "ttd";
    private const string Repo = "upgrade-me";
    private const string Developer = "testUser";
    private const string Token = "token";

    private readonly Mock<IAppUpgradeEngineClient> _engineClient = new();
    private readonly Mock<ISourceControl> _sourceControl = new();
    private readonly Mock<IGiteaClient> _giteaClient = new();

    [Fact]
    public async Task RunAsync_WhenEngineSucceeds_OpensPullRequestFromUpgradeBranch()
    {
        SetupCleanRepository();
        SetupPullRequestCreation();
        SetupEngineResponse(exitCode: 0, Step("Project file", ("Bumped Altinn.App.Api to 9.0.0", "OK")));
        AppUpgradeService service = CreateService();

        AppUpgradeResult result = await service.RunAsync(Context(), CancellationToken.None);

        Assert.Equal(AppUpgradeOutcome.Completed, result.Outcome);
        Assert.Empty(result.ManualTasks);
        Assert.Single(result.Steps);
        Assert.StartsWith("upgrade/altinn-app-v9-", result.BranchName);
        Assert.Equal(PullRequestUrl, result.PullRequestUrl);
        _sourceControl.Verify(
            s => s.CreateLocalBranch(It.IsAny<AltinnRepoEditingContext>(), result.BranchName, null),
            Times.Once
        );
        _sourceControl.Verify(
            s => s.CheckoutRepoOnBranch(It.IsAny<AltinnRepoEditingContext>(), result.BranchName),
            Times.Once
        );
        _sourceControl.Verify(
            s => s.CommitToLocalRepo(It.IsAny<AltinnRepoEditingContext>(), It.IsAny<string>()),
            Times.Once
        );
        _sourceControl.Verify(
            s => s.PublishBranch(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), result.BranchName),
            Times.Once
        );
        _giteaClient.Verify(
            g =>
                g.CreatePullRequestAsync(
                    Org,
                    Repo,
                    It.Is<CreatePullRequestOption>(o => o.Base == "main" && o.Head == result.BranchName),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        _sourceControl.Verify(
            s => s.PushChangesForRepository(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), It.IsAny<CommitInfo>()),
            Times.Never
        );
        _sourceControl.Verify(s => s.DiscardLocalChanges(It.IsAny<AltinnRepoEditingContext>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_WhenManualActionRequired_PushesAndListsOnlyActionableMessages()
    {
        SetupCleanRepository();
        SetupPullRequestCreation();
        SetupEngineResponse(
            exitCode: 3,
            Step("Project file", ("Bumped Altinn.App.Api to 9.0.0", "OK")),
            Step(
                "C# API",
                ("Removed IProcessTaskStart usage could not be rewritten", "TODO"),
                ("Datepicker component renamed", "WARN"),
                ("2 files scanned", "INFO"),
                ("Nothing to do for eFormidling", "SKIP")
            )
        );
        AppUpgradeService service = CreateService();

        AppUpgradeResult result = await service.RunAsync(Context(), CancellationToken.None);

        Assert.Equal(AppUpgradeOutcome.ManualStepsRequired, result.Outcome);
        Assert.Collection(
            result.ManualTasks,
            task =>
            {
                Assert.Equal("C# API", task.Step);
                Assert.Equal(AppUpgradeMessageStatus.Todo, task.Status);
            },
            task => Assert.Equal(AppUpgradeMessageStatus.Warning, task.Status)
        );
        _sourceControl.Verify(
            s => s.PublishBranch(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), result.BranchName),
            Times.Once
        );
        _giteaClient.Verify(
            g =>
                g.CreatePullRequestAsync(
                    Org,
                    Repo,
                    It.Is<CreatePullRequestOption>(o =>
                        o.Body.Contains("- [ ] **C# API**: Removed IProcessTaskStart usage could not be rewritten")
                    ),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Theory]
    [InlineData(1, AppUpgradeOutcome.Failed)]
    [InlineData(2, AppUpgradeOutcome.UnsupportedVersion)]
    public async Task RunAsync_WhenEngineDoesNotApply_DiscardsChangesWithoutPushing(
        int exitCode,
        AppUpgradeOutcome expectedOutcome
    )
    {
        SetupCleanRepository();
        SetupEngineResponse(exitCode, error: "Altinn.App.Api must be 8.x");
        AppUpgradeService service = CreateService();

        AppUpgradeResult result = await service.RunAsync(Context(), CancellationToken.None);

        Assert.Equal(expectedOutcome, result.Outcome);
        Assert.Equal("Altinn.App.Api must be 8.x", result.Message);
        _sourceControl.Verify(s => s.DiscardLocalChanges(It.IsAny<AltinnRepoEditingContext>()), Times.Once);
        _sourceControl.Verify(
            s => s.PublishBranch(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), It.IsAny<string>()),
            Times.Never
        );
        _giteaClient.Verify(
            g =>
                g.CreatePullRequestAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CreatePullRequestOption>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task RunAsync_WhenLocalChangesExist_StopsBeforeCallingEngine()
    {
        _sourceControl
            .Setup(s => s.RepositoryStatus(It.IsAny<AltinnRepoEditingContext>()))
            .Returns(
                new RepoStatus
                {
                    ContentStatus = [new RepositoryContent { FilePath = "App/ui/form/layouts/page.json" }],
                }
            );
        AppUpgradeService service = CreateService();

        AppUpgradeResult result = await service.RunAsync(Context(), CancellationToken.None);

        Assert.Equal(AppUpgradeOutcome.LocalChangesBlocking, result.Outcome);
        _engineClient.Verify(
            c => c.RunUpgradeAsync(It.IsAny<AppUpgradeEngineRequest>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task RunAsync_WhenEngineIsUnavailable_ReportsFailed()
    {
        SetupCleanRepository();
        _engineClient
            .Setup(c => c.RunUpgradeAsync(It.IsAny<AppUpgradeEngineRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AppUpgradeEngineException("connection refused"));
        AppUpgradeService service = CreateService();

        AppUpgradeResult result = await service.RunAsync(Context(), CancellationToken.None);

        Assert.Equal(AppUpgradeOutcome.Failed, result.Outcome);
        Assert.Equal("connection refused", result.Message);
    }

    [Theory]
    [InlineData("Program.cs", false)]
    [InlineData("TestDummy.cs", false)]
    [InlineData("MyDataProcessor.cs", true)]
    public async Task GetStatusAsync_DetectsCustomCodeNextToProgramFile(string fileName, bool expectedCustomCode)
    {
        SetupRemoteFile("App/App.csproj", CsprojWithAppApi("8.5.0"));
        SetupRemoteFile("App/views/Home/Index.cshtml", null);
        SetupRemoteDirectory("App", (fileName, "file"), ("config", "dir"));
        AppUpgradeService service = CreateService();

        AppUpgradeStatus status = await service.GetStatusAsync(
            AltinnRepoContext.FromOrgRepo(Org, Repo),
            CancellationToken.None
        );

        Assert.Equal(expectedCustomCode, status.HasCustomCode);
    }

    [Fact]
    public async Task GetStatusAsync_DetectsCustomCodeInLogicFolder()
    {
        SetupRemoteFile("App/App.csproj", CsprojWithAppApi("8.5.0"));
        SetupRemoteFile("App/views/Home/Index.cshtml", null);
        SetupRemoteDirectory("App", ("Program.cs", "file"), ("logic", "dir"));
        SetupRemoteDirectory("App/logic", ("TaskHooks.cs", "file"));
        AppUpgradeService service = CreateService();

        AppUpgradeStatus status = await service.GetStatusAsync(
            AltinnRepoContext.FromOrgRepo(Org, Repo),
            CancellationToken.None
        );

        Assert.True(status.HasCustomCode);
    }

    [Theory]
    [InlineData("8.5.0", true, true)]
    [InlineData("7.9.0", true, false)]
    [InlineData("9.0.0-preview.4", false, false)]
    public async Task GetStatusAsync_ReadsBackendVersionFromRemoteCsproj(
        string appApiVersion,
        bool expectedAvailable,
        bool expectedAutomatic
    )
    {
        string csproj = $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="{appApiVersion}" />
              </ItemGroup>
            </Project>
            """;
        SetupRemoteFile("App/App.csproj", csproj);
        SetupRemoteFile("App/views/Home/Index.cshtml", null);
        AppUpgradeService service = CreateService();

        AppUpgradeStatus status = await service.GetStatusAsync(
            AltinnRepoContext.FromOrgRepo(Org, Repo),
            CancellationToken.None
        );

        Assert.Equal(appApiVersion, status.BackendVersion);
        Assert.Equal(expectedAvailable, status.IsUpgradeAvailable);
        Assert.Equal(expectedAutomatic, status.IsAutomaticUpgradeSupported);
        Assert.Equal(9, status.TargetMajorVersion);
    }

    [Fact]
    public async Task PrepareAsync_WhenRepositoryIsCleanAndOnV8_ReportsReady()
    {
        SetupCleanRepository();
        SetupRemoteFile("App/App.csproj", CsprojWithAppApi("8.5.0"));
        SetupRemoteFile("App/views/Home/Index.cshtml", null);
        AppUpgradeService service = CreateService();

        AppUpgradePreparation preparation = await service.PrepareAsync(Context(), CancellationToken.None);

        Assert.Equal(AppUpgradePreparationStatus.Ready, preparation.Status);
        _sourceControl.Verify(s => s.PullRemoteChanges(It.IsAny<AltinnAuthenticatedRepoEditingContext>()), Times.Once);
    }

    [Fact]
    public async Task PrepareAsync_WhenAppIsNotOnV8_ReportsUnsupportedVersion()
    {
        SetupCleanRepository();
        SetupRemoteFile("App/App.csproj", CsprojWithAppApi("7.9.0"));
        SetupRemoteFile("App/views/Home/Index.cshtml", null);
        AppUpgradeService service = CreateService();

        AppUpgradePreparation preparation = await service.PrepareAsync(Context(), CancellationToken.None);

        Assert.Equal(AppUpgradePreparationStatus.UnsupportedVersion, preparation.Status);
    }

    [Fact]
    public async Task PrepareAsync_WhenLocalChangesExist_ReportsBlockingWithoutPulling()
    {
        _sourceControl
            .Setup(s => s.RepositoryStatus(It.IsAny<AltinnRepoEditingContext>()))
            .Returns(
                new RepoStatus
                {
                    ContentStatus = [new RepositoryContent { FilePath = "App/config/texts/resource.nb.json" }],
                }
            );
        AppUpgradeService service = CreateService();

        AppUpgradePreparation preparation = await service.PrepareAsync(Context(), CancellationToken.None);

        Assert.Equal(AppUpgradePreparationStatus.LocalChangesBlocking, preparation.Status);
        _sourceControl.Verify(s => s.PullRemoteChanges(It.IsAny<AltinnAuthenticatedRepoEditingContext>()), Times.Never);
    }

    private static string CsprojWithAppApi(string version) =>
        $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="{version}" />
              </ItemGroup>
            </Project>
            """;

    private const string PullRequestUrl = "http://studio.localhost/repos/ttd/upgrade-me/pulls/1";

    private void SetupPullRequestCreation()
    {
        _giteaClient
            .Setup(g => g.GetRepository(Org, Repo))
            .ReturnsAsync(new Altinn.Studio.Designer.RepositoryClient.Model.Repository { DefaultBranch = "main" });
        _giteaClient
            .Setup(g =>
                g.CreatePullRequestAsync(Org, Repo, It.IsAny<CreatePullRequestOption>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(new PullRequest { Number = 1, HtmlUrl = PullRequestUrl });
    }

    private void SetupCleanRepository()
    {
        _sourceControl
            .Setup(s => s.RepositoryStatus(It.IsAny<AltinnRepoEditingContext>()))
            .Returns(new RepoStatus { ContentStatus = [] });
    }

    private void SetupEngineResponse(int exitCode, params AppUpgradeEngineStep[] steps) =>
        SetupEngineResponse(exitCode, error: "", steps);

    private void SetupEngineResponse(int exitCode, string error, params AppUpgradeEngineStep[] steps)
    {
        _engineClient
            .Setup(c => c.RunUpgradeAsync(It.IsAny<AppUpgradeEngineRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AppUpgradeEngineResponse("", exitCode, "", error, steps));
    }

    private void SetupRemoteDirectory(string path, params (string Name, string Type)[] entries)
    {
        _giteaClient
            .Setup(g => g.GetDirectoryAsync(Org, Repo, path, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                entries
                    .Select(entry => new FileSystemObject
                    {
                        Name = entry.Name,
                        Path = $"{path}/{entry.Name}",
                        Type = entry.Type,
                    })
                    .ToList()
            );
    }

    private void SetupRemoteFile(string path, string content)
    {
        FileSystemObject file = content is null
            ? null
            : new FileSystemObject
            {
                Content = System.Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(content)),
            };
        _giteaClient
            .Setup(g => g.GetFileAsync(Org, Repo, path, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(file);
    }

    private static AppUpgradeEngineStep Step(string name, params (string Text, string Status)[] messages) =>
        new(name, messages.Select(m => new AppUpgradeEngineMessage(m.Text, m.Status)).ToList());

    private static AltinnAuthenticatedRepoEditingContext Context() =>
        AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(Org, Repo, Developer, Token);

    private AppUpgradeService CreateService() =>
        new(
            _engineClient.Object,
            _sourceControl.Object,
            _giteaClient.Object,
            new ServiceRepositorySettings { RepositoryLocation = "/tmp/repos" },
            Options.Create(new AppUpgradeSettings { EngineSocketPath = "/tmp/engine.sock" }),
            NullLogger<AppUpgradeService>.Instance
        );
}

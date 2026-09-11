using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto.AppUpgrade;
using Altinn.Studio.Designer.Models.GiteaActions;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AppUpgradeServiceTests
{
    private const string Org = "ttd";
    private const string Repo = "upgrade-me";
    private const string Developer = "testUser";
    private const string Token = "token";
    private const string BranchName = "upgrade/altinn-app-v9-20260907-120000";
    private const string PullRequestUrl = "http://studio.localhost/repos/ttd/upgrade-me/pulls/1";
    private const string RunUrl = "http://studio.localhost/repos/ttd/upgrade-me/actions/runs/7";

    private readonly Mock<ISourceControl> _sourceControl = new();
    private readonly Mock<IGiteaClient> _giteaClient = new();
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 9, 7, 12, 0, 0, TimeSpan.Zero));

    [Fact]
    public async Task StartAsync_WhenAppIsOnV8_PushesWorkflowToNewBranch()
    {
        SetupRepositoryWithDefaultBranch("main");
        SetupRemoteFile("App/App.csproj", CsprojWithAppApi("8.12.7"));
        SetupRemoteFile("App/views/Home/Index.cshtml", null);
        ChangeFilesOptions captured = null;
        _giteaClient
            .Setup(g => g.ChangeFilesAsync(Org, Repo, It.IsAny<ChangeFilesOptions>(), It.IsAny<CancellationToken>()))
            .Callback<string, string, ChangeFilesOptions, CancellationToken>((_, _, options, _) => captured = options)
            .ReturnsAsync(true);
        AppUpgradeService service = CreateService();

        AppUpgradeStart start = await service.StartAsync(Context(), CancellationToken.None);

        Assert.Equal(AppUpgradeStartStatus.Started, start.Status);
        Assert.Equal(BranchName, start.BranchName);
        Assert.NotNull(captured);
        Assert.Equal("main", captured.Branch);
        Assert.Equal(BranchName, captured.NewBranch);
        ChangeFileOperation file = Assert.Single(captured.Files);
        Assert.Equal(".gitea/workflows/altinn-studio-upgrade.yaml", file.Path);
        string workflow = Encoding.UTF8.GetString(Convert.FromBase64String(file.Content));
        Assert.Contains($"- '{BranchName}'", workflow);
        Assert.Contains("BASE_BRANCH: 'main'", workflow);
        Assert.Contains("studioctl app upgrade v9 --report", workflow);
        Assert.DoesNotContain("__", workflow.Replace("${{", "").Replace("__REPORT", "x"));
    }

    [Fact]
    public async Task StartAsync_WhenAppIsNotOnV8_ReportsUnsupportedVersion()
    {
        SetupRemoteFile("App/App.csproj", CsprojWithAppApi("7.9.0"));
        SetupRemoteFile("App/views/Home/Index.cshtml", null);
        AppUpgradeService service = CreateService();

        AppUpgradeStart start = await service.StartAsync(Context(), CancellationToken.None);

        Assert.Equal(AppUpgradeStartStatus.UnsupportedVersion, start.Status);
        _giteaClient.Verify(
            g =>
                g.ChangeFilesAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<ChangeFilesOptions>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task StartAsync_WhenGiteaRejectsTheBranch_ReportsFailed()
    {
        SetupRepositoryWithDefaultBranch("main");
        SetupRemoteFile("App/App.csproj", CsprojWithAppApi("8.12.7"));
        SetupRemoteFile("App/views/Home/Index.cshtml", null);
        _giteaClient
            .Setup(g => g.ChangeFilesAsync(Org, Repo, It.IsAny<ChangeFilesOptions>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        AppUpgradeService service = CreateService();

        AppUpgradeStart start = await service.StartAsync(Context(), CancellationToken.None);

        Assert.Equal(AppUpgradeStartStatus.Failed, start.Status);
    }

    [Fact]
    public async Task GetRunAsync_WhenNoRunExistsYet_ReportsQueued()
    {
        SetupRuns();
        SetupBranchCreatedAt(_time.GetUtcNow().AddMinutes(-1));
        AppUpgradeService service = CreateService();

        AppUpgradeRun run = await service.GetRunAsync(Context(), BranchName, CancellationToken.None);

        Assert.Equal(AppUpgradeRunState.Queued, run.State);
        Assert.Null(run.Result);
    }

    [Fact]
    public async Task GetRunAsync_WhenNoRunnerPicksUpTheBranch_FailsAfterTimeout()
    {
        SetupRuns();
        SetupBranchCreatedAt(_time.GetUtcNow().AddMinutes(-30));
        AppUpgradeService service = CreateService();

        AppUpgradeRun run = await service.GetRunAsync(Context(), BranchName, CancellationToken.None);

        Assert.Equal(AppUpgradeRunState.Completed, run.State);
        Assert.Equal(AppUpgradeOutcome.Failed, run.Result!.Outcome);
        Assert.Contains("runner", run.Result.Message);
    }

    [Fact]
    public async Task GetRunAsync_WhenRunIsInProgress_ReportsTheActiveStep()
    {
        SetupRuns(Run(status: "in_progress"));
        SetupJobs(
            Job(
                conclusion: null,
                ("Clone the app", "completed"),
                ("Install tools", "in_progress"),
                ("Upgrade the app", "queued")
            )
        );
        AppUpgradeService service = CreateService();

        AppUpgradeRun run = await service.GetRunAsync(Context(), BranchName, CancellationToken.None);

        Assert.Equal(AppUpgradeRunState.Running, run.State);
        Assert.Equal(RunUrl, run.RunUrl);
        Assert.Equal("Install tools", run.CurrentStep);
    }

    [Fact]
    public async Task GetRunAsync_WhenRunCompleted_ReadsReportPullRequestAndDiff()
    {
        SetupRuns(Run(status: "completed", conclusion: "success"));
        SetupJobs(Job(conclusion: "success"));
        SetupJobLogs(
            ReportLog(
                exitCode: 3,
                Step("Project file", ("Bumped Altinn.App.Api to 9.0.0", "OK")),
                Step("C# API", ("Rewrite IProcessTaskStart by hand", "TODO"), ("2 files scanned", "INFO"))
            )
        );
        SetupPullRequest();
        _giteaClient
            .Setup(g => g.GetPullRequestDiffAsync(Org, Repo, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleDiff);
        AppUpgradeService service = CreateService();

        AppUpgradeRun run = await service.GetRunAsync(Context(), BranchName, CancellationToken.None);

        Assert.Equal(AppUpgradeRunState.Completed, run.State);
        AppUpgradeResult result = run.Result!;
        Assert.Equal(AppUpgradeOutcome.ManualStepsRequired, result.Outcome);
        Assert.Equal(2, result.Steps.Count);
        AppUpgradeManualTask task = Assert.Single(result.ManualTasks);
        Assert.Equal("C# API", task.Step);
        Assert.Equal(AppUpgradeMessageStatus.Todo, task.Status);
        Assert.Equal(PullRequestUrl, result.PullRequestUrl);
        Assert.Equal(1, result.PullRequestNumber);
        Assert.Equal(BranchName, result.BranchName);
        Assert.Collection(
            result.FileChanges,
            change =>
            {
                Assert.Equal("App/App.csproj", change.Path);
                Assert.Equal(AppUpgradeFileChangeKind.Modified, change.Kind);
                Assert.Contains("+    <PackageReference Include=\"Altinn.App.Api\" Version=\"9.0.0\" />", change.Diff);
            },
            change =>
            {
                Assert.Equal("App/ui/Task_1/Settings.json", change.Path);
                Assert.Equal(AppUpgradeFileChangeKind.Renamed, change.Kind);
            },
            change =>
            {
                Assert.Equal("App/views/Home/Index.cshtml", change.Path);
                Assert.Equal(AppUpgradeFileChangeKind.Deleted, change.Kind);
            },
            change =>
            {
                Assert.Equal("App/ui/Task_1/layouts/Side2.json", change.Path);
                Assert.Equal(AppUpgradeFileChangeKind.Added, change.Kind);
            }
        );
    }

    [Fact]
    public async Task GetRunAsync_WhenUpgradeSucceededAndPullRequestExists_ReportsCompleted()
    {
        SetupRuns(Run(status: "completed", conclusion: "success"));
        SetupJobs(Job(conclusion: "success"));
        SetupJobLogs(ReportLog(exitCode: 0, Step("Project file", ("Bumped", "OK"))));
        SetupPullRequest();
        AppUpgradeService service = CreateService();

        AppUpgradeRun run = await service.GetRunAsync(Context(), BranchName, CancellationToken.None);

        Assert.Equal(AppUpgradeOutcome.Completed, run.Result!.Outcome);
        Assert.Empty(run.Result.ManualTasks);
    }

    [Fact]
    public async Task GetRunAsync_WhenReportSaysUnsupported_ReportsUnsupportedVersion()
    {
        SetupRuns(Run(status: "completed", conclusion: "failure"));
        SetupJobs(Job(conclusion: "failure"));
        SetupJobLogs(ReportLog(exitCode: 2, error: "Altinn.App.Api must be 8.x"));
        AppUpgradeService service = CreateService();

        AppUpgradeRun run = await service.GetRunAsync(Context(), BranchName, CancellationToken.None);

        Assert.Equal(AppUpgradeOutcome.UnsupportedVersion, run.Result!.Outcome);
        Assert.Equal("Altinn.App.Api must be 8.x", run.Result.Message);
        Assert.Null(run.Result.PullRequestUrl);
    }

    [Fact]
    public async Task GetRunAsync_WhenRunFailedWithoutReport_ReportsFailed()
    {
        SetupRuns(Run(status: "completed", conclusion: "failure"));
        SetupJobs(Job(conclusion: "failure"));
        SetupJobLogs("Cloning into 'app'...\nfatal: could not read from remote");
        AppUpgradeService service = CreateService();

        AppUpgradeRun run = await service.GetRunAsync(Context(), BranchName, CancellationToken.None);

        Assert.Equal(AppUpgradeOutcome.Failed, run.Result!.Outcome);
        Assert.Equal(RunUrl, run.RunUrl);
    }

    [Fact]
    public async Task MergeAsync_WhenGiteaMerges_RefreshesLocalCloneOnDefaultBranch()
    {
        SetupRepositoryWithDefaultBranch("main");
        _giteaClient
            .Setup(g =>
                g.MergePullRequestAsync(
                    Org,
                    Repo,
                    1,
                    It.Is<MergePullRequestOption>(o => o.DeleteBranchAfterMerge),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(true);
        AppUpgradeService service = CreateService();

        AppUpgradeMergeResult result = await service.MergeAsync(
            AuthenticatedContext(),
            new AppUpgradeMergeRequest(1, BranchName),
            CancellationToken.None
        );

        Assert.True(result.IsMerged);
        Assert.Equal("main", result.BaseBranch);
        _sourceControl.Verify(s => s.CheckoutRepoOnBranch(It.IsAny<AltinnRepoEditingContext>(), "main"), Times.Once);
        _sourceControl.Verify(s => s.PullRemoteChanges(It.IsAny<AltinnAuthenticatedRepoEditingContext>()), Times.Once);
    }

    [Fact]
    public async Task MergeAsync_WhenGiteaRefuses_LeavesLocalCloneUntouched()
    {
        SetupRepositoryWithDefaultBranch("main");
        _giteaClient
            .Setup(g =>
                g.MergePullRequestAsync(Org, Repo, 1, It.IsAny<MergePullRequestOption>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(false);
        AppUpgradeService service = CreateService();

        AppUpgradeMergeResult result = await service.MergeAsync(
            AuthenticatedContext(),
            new AppUpgradeMergeRequest(1, null),
            CancellationToken.None
        );

        Assert.False(result.IsMerged);
        _sourceControl.Verify(
            s => s.CheckoutRepoOnBranch(It.IsAny<AltinnRepoEditingContext>(), It.IsAny<string>()),
            Times.Never
        );
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

        AppUpgradeStatus status = await service.GetStatusAsync(Context(), CancellationToken.None);

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

        AppUpgradeStatus status = await service.GetStatusAsync(Context(), CancellationToken.None);

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
        SetupRemoteFile("App/App.csproj", CsprojWithAppApi(appApiVersion));
        SetupRemoteFile("App/views/Home/Index.cshtml", null);
        AppUpgradeService service = CreateService();

        AppUpgradeStatus status = await service.GetStatusAsync(Context(), CancellationToken.None);

        Assert.Equal(appApiVersion, status.BackendVersion);
        Assert.Equal(expectedAvailable, status.IsUpgradeAvailable);
        Assert.Equal(expectedAutomatic, status.IsAutomaticUpgradeSupported);
        Assert.Equal(9, status.TargetMajorVersion);
    }

    private const string SampleDiff = """
        diff --git a/App/App.csproj b/App/App.csproj
        index 1111111..2222222 100644
        --- a/App/App.csproj
        +++ b/App/App.csproj
        @@ -1,3 +1,3 @@
        -    <PackageReference Include="Altinn.App.Api" Version="8.12.7" />
        +    <PackageReference Include="Altinn.App.Api" Version="9.0.0" />
        diff --git a/App/ui/form/Settings.json b/App/ui/Task_1/Settings.json
        similarity index 100%
        rename from App/ui/form/Settings.json
        rename to App/ui/Task_1/Settings.json
        diff --git a/App/views/Home/Index.cshtml b/App/views/Home/Index.cshtml
        deleted file mode 100644
        index 3333333..0000000
        --- a/App/views/Home/Index.cshtml
        +++ /dev/null
        @@ -1,2 +0,0 @@
        -<html>
        -</html>
        diff --git a/App/ui/Task_1/layouts/Side2.json b/App/ui/Task_1/layouts/Side2.json
        new file mode 100644
        index 0000000..4444444
        --- /dev/null
        +++ b/App/ui/Task_1/layouts/Side2.json
        @@ -0,0 +1 @@
        +{}
        """;

    private static string CsprojWithAppApi(string version) =>
        $"""
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="{version}" />
              </ItemGroup>
            </Project>
            """;

    private static ActionWorkflowRun Run(string status, string conclusion = null) =>
        new()
        {
            Id = 7,
            Status = status,
            Conclusion = conclusion,
            HeadBranch = BranchName,
            HtmlUrl = RunUrl,
        };

    private static ActionWorkflowJob Job(string conclusion, params (string Name, string Status)[] steps) =>
        new()
        {
            Id = 70,
            Name = "upgrade",
            Conclusion = conclusion,
            Steps = steps.Select(step => new ActionWorkflowStep { Name = step.Name, Status = step.Status }).ToArray(),
        };

    private static string ReportLog(int exitCode, params object[] steps) => ReportLog(exitCode, error: "", steps);

    private static string ReportLog(int exitCode, string error, params object[] steps)
    {
        string json = System.Text.Json.JsonSerializer.Serialize(
            new
            {
                exitCode,
                message = "",
                output = "",
                error,
                steps,
            }
        );
        string encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(json));
        return $"2026-09-07T12:00:00Z Running studioctl...\n2026-09-07T12:01:00Z {AppUpgradeWorkflow.ReportLogMarker}{encoded}\n2026-09-07T12:01:01Z done\n";
    }

    private static object Step(string name, params (string Text, string Status)[] messages) =>
        new { name, messages = messages.Select(m => new { text = m.Text, status = m.Status }).ToArray() };

    private void SetupRuns(params ActionWorkflowRun[] runs) =>
        _giteaClient
            .Setup(g => g.ListWorkflowRunsAsync(Org, Repo, BranchName, It.IsAny<CancellationToken>()))
            .ReturnsAsync(runs.ToList());

    private void SetupJobs(params ActionWorkflowJob[] jobs) =>
        _giteaClient
            .Setup(g => g.ListWorkflowRunJobsAsync(Org, Repo, 7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(jobs.ToList());

    private void SetupJobLogs(string logs) =>
        _giteaClient
            .Setup(g => g.GetWorkflowJobLogsAsync(Org, Repo, 70, It.IsAny<CancellationToken>()))
            .ReturnsAsync(logs);

    private void SetupPullRequest() =>
        _giteaClient
            .Setup(g => g.ListPullRequestsAsync(Org, Repo, "all", It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new PullRequest
                {
                    Number = 1,
                    HtmlUrl = PullRequestUrl,
                    Head = new PullRequestBranch { Ref = BranchName },
                },
            ]);

    private void SetupBranchCreatedAt(DateTimeOffset createdAt) =>
        _giteaClient
            .Setup(g => g.GetBranch(Org, Repo, BranchName))
            .ReturnsAsync(
                new Branch
                {
                    Name = BranchName,
                    Commit = new PayloadCommit { Timestamp = createdAt.ToString("O") },
                }
            );

    private void SetupRepositoryWithDefaultBranch(string defaultBranch) =>
        _giteaClient
            .Setup(g => g.GetRepository(Org, Repo))
            .ReturnsAsync(new Repository { DefaultBranch = defaultBranch });

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
            : new FileSystemObject { Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(content)) };
        _giteaClient
            .Setup(g => g.GetFileAsync(Org, Repo, path, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(file);
    }

    private static AltinnRepoContext Context() => AltinnRepoContext.FromOrgRepo(Org, Repo);

    private static AltinnAuthenticatedRepoEditingContext AuthenticatedContext() =>
        AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(Org, Repo, Developer, Token);

    private AppUpgradeService CreateService() =>
        new(
            _giteaClient.Object,
            _sourceControl.Object,
            Options.Create(new AppUpgradeSettings()),
            _time,
            NullLogger<AppUpgradeService>.Instance
        );
}

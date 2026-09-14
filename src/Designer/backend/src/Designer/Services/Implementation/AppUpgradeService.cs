using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto.AppUpgrade;
using Altinn.Studio.Designer.Models.GiteaActions;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Implementation;

public partial class AppUpgradeService : IAppUpgradeService
{
    private const int TargetMajorVersion = 9;
    private const int AutomaticUpgradeSourceMajorVersion = 8;
    private const string CsprojPath = "App/App.csproj";
    private const string IndexPath = "App/views/Home/Index.cshtml";
    private const string AppFolder = "App";
    private const string CustomCodeFolder = "App/logic";
    private static readonly string[] s_templateCodeFiles = ["Program.cs", "TestDummy.cs"];
    private static readonly string[] s_appLibPackageNames = ["Altinn.App.Api", "Altinn.App.Api.Experimental"];

    private const int ExitCodeSuccess = 0;
    private const int ExitCodeUnsupportedSourceVersion = 2;
    private const int ExitCodeManualActionRequired = 3;

    private static readonly string[] s_queuedRunStatuses = ["queued", "waiting", "blocked", "pending", "unknown"];
    private static readonly string[] s_runningRunStatuses = ["in_progress", "running"];

    private static readonly JsonSerializerOptions s_reportJsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IGiteaClient _giteaClient;
    private readonly ISourceControl _sourceControl;
    private readonly AppUpgradeSettings _settings;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<AppUpgradeService> _logger;

    public AppUpgradeService(
        IGiteaClient giteaClient,
        ISourceControl sourceControl,
        IOptions<AppUpgradeSettings> settings,
        TimeProvider timeProvider,
        ILogger<AppUpgradeService> logger
    )
    {
        _giteaClient = giteaClient;
        _sourceControl = sourceControl;
        _settings = settings.Value;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<AppUpgradeStatus> GetStatusAsync(
        AltinnRepoContext repoContext,
        CancellationToken cancellationToken
    )
    {
        byte[]? csproj = await ReadRemoteFileAsync(repoContext, CsprojPath, cancellationToken);
        SemanticVersion? backendVersion = null;
        if (csproj is not null)
        {
            PackageVersionHelper.TryGetPackageVersionFromCsprojContent(
                csproj,
                s_appLibPackageNames,
                out backendVersion
            );
        }

        string? frontendVersion = null;
        if (backendVersion is not null && backendVersion.Major >= TargetMajorVersion)
        {
            frontendVersion = backendVersion.Major.ToString();
        }
        else
        {
            byte[]? index = await ReadRemoteFileAsync(repoContext, IndexPath, cancellationToken);
            if (index is not null)
            {
                AppFrontendVersionHelper.TryGetFrontendVersionFromIndexContent(
                    Encoding.UTF8.GetString(index),
                    out frontendVersion
                );
            }
        }

        bool isUpgradeAvailable = backendVersion is not null && backendVersion.Major < TargetMajorVersion;
        bool isAutomaticUpgradeSupported =
            backendVersion is not null && backendVersion.Major == AutomaticUpgradeSourceMajorVersion;
        bool hasCustomCode = isUpgradeAvailable && await HasCustomCodeAsync(repoContext, cancellationToken);

        return new AppUpgradeStatus(
            backendVersion?.ToString(),
            frontendVersion,
            TargetMajorVersion,
            isUpgradeAvailable,
            isAutomaticUpgradeSupported,
            hasCustomCode
        );
    }

    private async Task<bool> HasCustomCodeAsync(AltinnRepoContext repoContext, CancellationToken cancellationToken)
    {
        List<FileSystemObject>? appFiles = await _giteaClient.GetDirectoryAsync(
            repoContext.Org,
            repoContext.Repo,
            AppFolder,
            cancellationToken: cancellationToken
        );
        if (appFiles is null)
        {
            return false;
        }

        if (appFiles.Any(file => IsCustomCodeFile(file) && !s_templateCodeFiles.Contains(file.Name)))
        {
            return true;
        }

        if (appFiles.All(file => file.Type != "dir" || file.Path != CustomCodeFolder))
        {
            return false;
        }

        List<FileSystemObject>? logicFiles = await _giteaClient.GetDirectoryAsync(
            repoContext.Org,
            repoContext.Repo,
            CustomCodeFolder,
            cancellationToken: cancellationToken
        );
        return logicFiles?.Any(file => file.Type == "dir" || IsCustomCodeFile(file)) ?? false;
    }

    private static bool IsCustomCodeFile(FileSystemObject file) =>
        file.Type == "file" && file.Name.EndsWith(".cs", StringComparison.OrdinalIgnoreCase);

    public async Task<AppUpgradeStart> StartAsync(AltinnRepoContext repoContext, CancellationToken cancellationToken)
    {
        AppUpgradeStatus status = await GetStatusAsync(repoContext, cancellationToken);
        if (!status.IsAutomaticUpgradeSupported)
        {
            return new AppUpgradeStart(
                AppUpgradeStartStatus.UnsupportedVersion,
                "The automatic upgrade supports apps on version 8. Upgrade the app to version 8 first."
            );
        }

        string baseBranch = await GetDefaultBranch(repoContext);
        string branchName = $"{_settings.BranchPrefix}{_timeProvider.GetUtcNow():yyyyMMdd-HHmmss}";
        string workflow = AppUpgradeWorkflow.Render(
            new AppUpgradeWorkflow.Parameters(
                branchName,
                baseBranch,
                TargetMajorVersion,
                _settings.CommitMessage,
                _settings.StudioctlInstallUrl,
                _settings.WorkflowPath
            )
        );

        bool created = await _giteaClient.ChangeFilesAsync(
            repoContext.Org,
            repoContext.Repo,
            new ChangeFilesOptions
            {
                Branch = baseBranch,
                NewBranch = branchName,
                Message = $"Start automatic upgrade to Altinn.App v{TargetMajorVersion}",
                Files =
                [
                    new ChangeFileOperation
                    {
                        Operation = "create",
                        Path = _settings.WorkflowPath,
                        Content = Convert.ToBase64String(Encoding.UTF8.GetBytes(workflow)),
                    },
                ],
            },
            cancellationToken
        );
        if (!created)
        {
            return new AppUpgradeStart(
                AppUpgradeStartStatus.Failed,
                "The upgrade branch could not be created in the repository."
            );
        }

        return new AppUpgradeStart(AppUpgradeStartStatus.Started, "The upgrade has been queued.", branchName);
    }

    public async Task<AppUpgradeRun> GetRunAsync(
        AltinnRepoContext repoContext,
        string branchName,
        CancellationToken cancellationToken
    )
    {
        List<ActionWorkflowRun> runs = await _giteaClient.ListWorkflowRunsAsync(
            repoContext.Org,
            repoContext.Repo,
            branchName,
            cancellationToken
        );
        ActionWorkflowRun? run = runs.Where(candidate => candidate.HeadBranch == branchName)
            .OrderByDescending(candidate => candidate.Id)
            .FirstOrDefault();
        if (run is null)
        {
            return await DescribeMissingRun(repoContext, branchName);
        }

        string status = (run.Status ?? string.Empty).ToLowerInvariant();
        if (s_queuedRunStatuses.Contains(status))
        {
            return new AppUpgradeRun(AppUpgradeRunState.Queued, run.HtmlUrl);
        }

        List<ActionWorkflowJob> jobs = await _giteaClient.ListWorkflowRunJobsAsync(
            repoContext.Org,
            repoContext.Repo,
            run.Id,
            cancellationToken
        );
        if (s_runningRunStatuses.Contains(status))
        {
            return new AppUpgradeRun(AppUpgradeRunState.Running, run.HtmlUrl, CurrentStepName(jobs));
        }

        AppUpgradeResult result = await BuildResult(repoContext, branchName, run, jobs, cancellationToken);
        return new AppUpgradeRun(AppUpgradeRunState.Completed, run.HtmlUrl, null, result);
    }

    private async Task<AppUpgradeRun> DescribeMissingRun(AltinnRepoContext repoContext, string branchName)
    {
        RepositoryClient.Model.Branch? branch = await _giteaClient.GetBranch(
            repoContext.Org,
            repoContext.Repo,
            branchName
        );
        if (branch is null)
        {
            return CompletedWithFailure(branchName, "The upgrade branch no longer exists in the repository.");
        }

        if (
            DateTimeOffset.TryParse(
                branch.Commit?.Timestamp,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out DateTimeOffset createdAt
            )
            && _timeProvider.GetUtcNow() - createdAt > TimeSpan.FromMinutes(_settings.RunnerPickupTimeoutMinutes)
        )
        {
            return CompletedWithFailure(
                branchName,
                $"No runner picked up the upgrade within {_settings.RunnerPickupTimeoutMinutes} minutes. "
                    + "Check that Gitea Actions runners are available for the organization."
            );
        }

        return new AppUpgradeRun(AppUpgradeRunState.Queued);
    }

    private static AppUpgradeRun CompletedWithFailure(string branchName, string message) =>
        new(
            AppUpgradeRunState.Completed,
            Result: new AppUpgradeResult(AppUpgradeOutcome.Failed, message, TargetMajorVersion, [], [], [], branchName)
        );

    private static string? CurrentStepName(List<ActionWorkflowJob> jobs) =>
        jobs.SelectMany(job => job.Steps)
            .FirstOrDefault(step => s_runningRunStatuses.Contains((step.Status ?? string.Empty).ToLowerInvariant()))
            ?.Name;

    private async Task<AppUpgradeResult> BuildResult(
        AltinnRepoContext repoContext,
        string branchName,
        ActionWorkflowRun run,
        List<ActionWorkflowJob> jobs,
        CancellationToken cancellationToken
    )
    {
        StudioctlUpgradeReport? report = null;
        ActionWorkflowJob? job = jobs.OrderBy(candidate => candidate.Id).FirstOrDefault();
        if (job is not null)
        {
            string? logs = await _giteaClient.GetWorkflowJobLogsAsync(
                repoContext.Org,
                repoContext.Repo,
                job.Id,
                cancellationToken
            );
            report = ParseReport(logs);
        }

        IReadOnlyList<AppUpgradeStep> steps = MapSteps(report?.Steps);
        IReadOnlyList<AppUpgradeManualTask> manualTasks = CollectManualTasks(steps);

        List<PullRequest> pullRequests =
            await _giteaClient.ListPullRequestsAsync(repoContext.Org, repoContext.Repo, "all", cancellationToken) ?? [];
        PullRequest? pullRequest = pullRequests
            .Where(candidate => candidate.Head?.Ref == branchName)
            .OrderByDescending(candidate => candidate.Number)
            .FirstOrDefault();

        IReadOnlyList<AppUpgradeFileChange> fileChanges = [];
        if (pullRequest is not null)
        {
            string? diff = await _giteaClient.GetPullRequestDiffAsync(
                repoContext.Org,
                repoContext.Repo,
                pullRequest.Number,
                cancellationToken
            );
            fileChanges = ParseUnifiedDiff(diff);
        }

        (AppUpgradeOutcome outcome, string message) = DetermineOutcome(report, run, pullRequest);
        return new AppUpgradeResult(
            outcome,
            message,
            TargetMajorVersion,
            steps,
            manualTasks,
            fileChanges,
            branchName,
            pullRequest?.HtmlUrl,
            pullRequest?.Number
        );
    }

    private static (AppUpgradeOutcome Outcome, string Message) DetermineOutcome(
        StudioctlUpgradeReport? report,
        ActionWorkflowRun run,
        PullRequest? pullRequest
    )
    {
        if (report is null)
        {
            bool succeeded = string.Equals(run.Conclusion ?? run.Status, "success", StringComparison.OrdinalIgnoreCase);
            return succeeded && pullRequest is not null
                ? (AppUpgradeOutcome.Completed, "The app was upgraded automatically.")
                : (AppUpgradeOutcome.Failed, "The upgrade run did not report a result. See the run log for details.");
        }

        switch (report.ExitCode)
        {
            case ExitCodeSuccess when pullRequest is not null:
                return (AppUpgradeOutcome.Completed, "The app was upgraded automatically.");
            case ExitCodeManualActionRequired when pullRequest is not null:
                return (
                    AppUpgradeOutcome.ManualStepsRequired,
                    "Parts of the upgrade were applied. The remaining tasks must be finished by hand."
                );
            case ExitCodeSuccess:
            case ExitCodeManualActionRequired:
                return (
                    AppUpgradeOutcome.Failed,
                    "The upgrade was applied but the pull request could not be opened. See the run log for details."
                );
            case ExitCodeUnsupportedSourceVersion:
                return (
                    AppUpgradeOutcome.UnsupportedVersion,
                    FirstNonEmpty(
                        report.Error,
                        report.Message,
                        "The app is not on a version that can be upgraded automatically."
                    )
                );
            default:
                return (AppUpgradeOutcome.Failed, FirstNonEmpty(report.Error, report.Message, "The upgrade failed."));
        }
    }

    public async Task<AppUpgradeMergeResult> MergeAsync(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        AppUpgradeMergeRequest request,
        CancellationToken cancellationToken
    )
    {
        string baseBranch = await GetDefaultBranch(authenticatedContext);
        bool isMerged = await _giteaClient.MergePullRequestAsync(
            authenticatedContext.Org,
            authenticatedContext.Repo,
            request.PullRequestNumber,
            new MergePullRequestOption { MergeTitleField = _settings.CommitMessage, DeleteBranchAfterMerge = true },
            cancellationToken
        );
        if (!isMerged)
        {
            return new AppUpgradeMergeResult(
                false,
                "The pull request could not be merged. Review it in the repository and merge it from there.",
                baseBranch
            );
        }

        RefreshLocalClone(authenticatedContext, baseBranch);
        return new AppUpgradeMergeResult(true, $"The upgrade was merged into {baseBranch}.", baseBranch);
    }

    private void RefreshLocalClone(AltinnAuthenticatedRepoEditingContext authenticatedContext, string baseBranch)
    {
        try
        {
            _sourceControl.CloneIfNotExists(authenticatedContext);
            _sourceControl.FetchRemoteChanges(authenticatedContext);
            _sourceControl.CheckoutRepoOnBranch(authenticatedContext, baseBranch);
            _sourceControl.PullRemoteChanges(authenticatedContext);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Could not refresh the local clone of {Org}/{Repo} on {Branch} after merging the upgrade",
                authenticatedContext.Org,
                authenticatedContext.Repo,
                baseBranch
            );
        }
    }

    private async Task<string> GetDefaultBranch(AltinnRepoContext repoContext)
    {
        RepositoryClient.Model.Repository? repository = await _giteaClient.GetRepository(
            repoContext.Org,
            repoContext.Repo
        );
        return repository?.DefaultBranch ?? General.DefaultBranch;
    }

    private async Task<byte[]?> ReadRemoteFileAsync(
        AltinnRepoContext repoContext,
        string filePath,
        CancellationToken cancellationToken
    )
    {
        FileSystemObject? file = await _giteaClient.GetFileAsync(
            repoContext.Org,
            repoContext.Repo,
            filePath,
            reference: null,
            cancellationToken
        );
        if (string.IsNullOrEmpty(file?.Content))
        {
            return null;
        }

        try
        {
            return Convert.FromBase64String(file.Content);
        }
        catch (FormatException ex)
        {
            _logger.LogWarning(
                ex,
                "Could not decode {FilePath} for {Org}/{Repo}",
                filePath,
                repoContext.Org,
                repoContext.Repo
            );
            return null;
        }
    }

    internal static StudioctlUpgradeReport? ParseReport(string? logs)
    {
        if (string.IsNullOrEmpty(logs))
        {
            return null;
        }

        Match match = ReportMarkerRegex().Match(logs);
        if (!match.Success)
        {
            return null;
        }

        try
        {
            byte[] json = Convert.FromBase64String(match.Groups[1].Value);
            return JsonSerializer.Deserialize<StudioctlUpgradeReport>(json, s_reportJsonOptions);
        }
        catch (Exception ex) when (ex is FormatException or JsonException)
        {
            return null;
        }
    }

    [GeneratedRegex(@"::studio-upgrade-report::([A-Za-z0-9+/=]+)")]
    private static partial Regex ReportMarkerRegex();

    [GeneratedRegex(@"^diff --git a/(.+?) b/(.+)$")]
    private static partial Regex DiffHeaderRegex();

    internal static IReadOnlyList<AppUpgradeFileChange> ParseUnifiedDiff(string? diff)
    {
        if (string.IsNullOrEmpty(diff))
        {
            return [];
        }

        List<AppUpgradeFileChange> changes = [];
        string? path = null;
        AppUpgradeFileChangeKind kind = AppUpgradeFileChangeKind.Modified;
        StringBuilder section = new();

        void Flush()
        {
            if (path is not null)
            {
                changes.Add(new AppUpgradeFileChange(path, kind, section.ToString()));
            }
            section.Clear();
        }

        foreach (string line in diff.Split('\n'))
        {
            Match header = DiffHeaderRegex().Match(line.TrimEnd('\r'));
            if (header.Success)
            {
                Flush();
                path = header.Groups[2].Value;
                kind = AppUpgradeFileChangeKind.Modified;
            }
            else if (path is not null)
            {
                if (line.StartsWith("new file mode", StringComparison.Ordinal))
                {
                    kind = AppUpgradeFileChangeKind.Added;
                }
                else if (line.StartsWith("deleted file mode", StringComparison.Ordinal))
                {
                    kind = AppUpgradeFileChangeKind.Deleted;
                }
                else if (line.StartsWith("rename to ", StringComparison.Ordinal))
                {
                    kind = AppUpgradeFileChangeKind.Renamed;
                    path = line["rename to ".Length..].TrimEnd('\r');
                }
            }

            section.Append(line).Append('\n');
        }

        Flush();
        return changes;
    }

    private static IReadOnlyList<AppUpgradeStep> MapSteps(IReadOnlyList<StudioctlUpgradeStep>? steps) =>
        steps is null
            ? []
            :
            [
                .. steps.Select(step => new AppUpgradeStep(
                    step.Name ?? string.Empty,
                    [
                        .. (step.Messages ?? []).Select(message => new AppUpgradeMessage(
                            message.Text ?? string.Empty,
                            MapStatus(message.Status)
                        )),
                    ]
                )),
            ];

    private static AppUpgradeMessageStatus MapStatus(string? wireStatus) =>
        wireStatus?.ToUpperInvariant() switch
        {
            "OK" => AppUpgradeMessageStatus.Ok,
            "SKIP" => AppUpgradeMessageStatus.Skip,
            "WARN" => AppUpgradeMessageStatus.Warning,
            "TODO" => AppUpgradeMessageStatus.Todo,
            "FAIL" => AppUpgradeMessageStatus.Failed,
            _ => AppUpgradeMessageStatus.Info,
        };

    private static IReadOnlyList<AppUpgradeManualTask> CollectManualTasks(IReadOnlyList<AppUpgradeStep> steps) =>
        [
            .. steps.SelectMany(step =>
                step.Messages.Where(message =>
                        message.Status
                            is AppUpgradeMessageStatus.Todo
                                or AppUpgradeMessageStatus.Warning
                                or AppUpgradeMessageStatus.Failed
                    )
                    .Select(message => new AppUpgradeManualTask(step.Name, message.Text, message.Status))
            ),
        ];

    private static string FirstNonEmpty(params string?[] candidates) =>
        candidates.FirstOrDefault(candidate => !string.IsNullOrWhiteSpace(candidate))?.Trim() ?? string.Empty;

    internal sealed record StudioctlUpgradeReport(
        int ExitCode,
        string? Message,
        string? Error,
        IReadOnlyList<StudioctlUpgradeStep>? Steps
    );

    internal sealed record StudioctlUpgradeStep(string? Name, IReadOnlyList<StudioctlUpgradeMessage>? Messages);

    internal sealed record StudioctlUpgradeMessage(string? Text, string? Status);
}

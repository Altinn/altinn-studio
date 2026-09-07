using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto.AppUpgrade;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine;
using Altinn.Studio.Designer.TypedHttpClients.AppUpgradeEngine.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NuGet.Versioning;

namespace Altinn.Studio.Designer.Services.Implementation;

public class AppUpgradeService : IAppUpgradeService
{
    private const string V9UpgradeKind = "v9";
    private const int TargetMajorVersion = 9;
    private const int AutomaticUpgradeSourceMajorVersion = 8;
    private const string CsprojPath = "App/App.csproj";
    private const string IndexPath = "App/views/Home/Index.cshtml";
    private const string AppFolder = "App";
    private const string CustomCodeFolder = "App/logic";
    private static readonly string[] s_templateCodeFiles = ["Program.cs", "TestDummy.cs"];

    private const string LocalChangesMessage =
        "The app has local changes that are not committed. Commit or discard them before upgrading.";

    private const int ExitCodeSuccess = 0;
    private const int ExitCodeError = 1;
    private const int ExitCodeUnsupportedSourceVersion = 2;
    private const int ExitCodeManualActionRequired = 3;

    private static readonly string[] s_appLibPackageNames = ["Altinn.App.Api", "Altinn.App.Api.Experimental"];

    private readonly IAppUpgradeEngineClient _engineClient;
    private readonly ISourceControl _sourceControl;
    private readonly IGiteaClient _giteaClient;
    private readonly ServiceRepositorySettings _repositorySettings;
    private readonly AppUpgradeSettings _settings;
    private readonly ILogger<AppUpgradeService> _logger;

    public AppUpgradeService(
        IAppUpgradeEngineClient engineClient,
        ISourceControl sourceControl,
        IGiteaClient giteaClient,
        ServiceRepositorySettings repositorySettings,
        IOptions<AppUpgradeSettings> settings,
        ILogger<AppUpgradeService> logger
    )
    {
        _engineClient = engineClient;
        _sourceControl = sourceControl;
        _giteaClient = giteaClient;
        _repositorySettings = repositorySettings;
        _settings = settings.Value;
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

    public async Task<AppUpgradePreparation> PrepareAsync(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        CancellationToken cancellationToken
    )
    {
        _sourceControl.CloneIfNotExists(authenticatedContext);

        RepoStatus localStatus = _sourceControl.RepositoryStatus(authenticatedContext);
        if (localStatus.ContentStatus is { Count: > 0 })
        {
            return new AppUpgradePreparation(AppUpgradePreparationStatus.LocalChangesBlocking, LocalChangesMessage);
        }

        _sourceControl.PullRemoteChanges(authenticatedContext);

        AppUpgradeStatus status = await GetStatusAsync(authenticatedContext, cancellationToken);
        if (!status.IsAutomaticUpgradeSupported)
        {
            return new AppUpgradePreparation(
                AppUpgradePreparationStatus.UnsupportedVersion,
                "The automatic upgrade supports apps on version 8. Upgrade the app to version 8 first."
            );
        }

        return new AppUpgradePreparation(AppUpgradePreparationStatus.Ready, "The app is ready to be upgraded.");
    }

    public async Task<AppUpgradeResult> RunAsync(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        CancellationToken cancellationToken
    )
    {
        _sourceControl.CloneIfNotExists(authenticatedContext);

        RepoStatus localStatus = _sourceControl.RepositoryStatus(authenticatedContext);
        if (localStatus.ContentStatus is { Count: > 0 })
        {
            return new AppUpgradeResult(
                AppUpgradeOutcome.LocalChangesBlocking,
                LocalChangesMessage,
                TargetMajorVersion,
                [],
                []
            );
        }

        _sourceControl.PullRemoteChanges(authenticatedContext);

        string projectFolder = _repositorySettings.GetServicePath(
            authenticatedContext.Org,
            authenticatedContext.Repo,
            authenticatedContext.Developer
        );

        AppUpgradeEngineResponse response;
        try
        {
            response = await _engineClient.RunUpgradeAsync(
                new AppUpgradeEngineRequest(
                    Kind: V9UpgradeKind,
                    ProjectFolder: projectFolder,
                    StudioRoot: null,
                    ConvertPackageReferences: false,
                    AllowDirty: false
                ),
                CancellationToken.None
            );
        }
        catch (AppUpgradeEngineException ex)
        {
            _logger.LogError(
                ex,
                "App upgrade engine failed for {Org}/{Repo}",
                authenticatedContext.Org,
                authenticatedContext.Repo
            );
            DiscardUpgradeChanges(authenticatedContext);
            return new AppUpgradeResult(AppUpgradeOutcome.Failed, ex.Message, TargetMajorVersion, [], []);
        }

        IReadOnlyList<AppUpgradeStep> steps = MapSteps(response.Steps);
        IReadOnlyList<AppUpgradeManualTask> manualTasks = CollectManualTasks(steps);

        switch (response.ExitCode)
        {
            case ExitCodeSuccess:
            {
                UpgradePullRequest pullRequest = await OpenPullRequest(authenticatedContext, steps, manualTasks);
                return new AppUpgradeResult(
                    AppUpgradeOutcome.Completed,
                    "The app was upgraded automatically.",
                    TargetMajorVersion,
                    steps,
                    manualTasks,
                    pullRequest.BranchName,
                    pullRequest.Url
                );
            }
            case ExitCodeManualActionRequired:
            {
                UpgradePullRequest pullRequest = await OpenPullRequest(authenticatedContext, steps, manualTasks);
                return new AppUpgradeResult(
                    AppUpgradeOutcome.ManualStepsRequired,
                    "Parts of the upgrade were applied. The remaining tasks must be finished by hand.",
                    TargetMajorVersion,
                    steps,
                    manualTasks,
                    pullRequest.BranchName,
                    pullRequest.Url
                );
            }
            case ExitCodeUnsupportedSourceVersion:
                DiscardUpgradeChanges(authenticatedContext);
                return new AppUpgradeResult(
                    AppUpgradeOutcome.UnsupportedVersion,
                    FirstNonEmpty(
                        response.Error,
                        response.Message,
                        "The app is not on a version that can be upgraded automatically."
                    ),
                    TargetMajorVersion,
                    steps,
                    manualTasks
                );
            case ExitCodeError:
            default:
                DiscardUpgradeChanges(authenticatedContext);
                return new AppUpgradeResult(
                    AppUpgradeOutcome.Failed,
                    FirstNonEmpty(response.Error, response.Message, "The upgrade failed."),
                    TargetMajorVersion,
                    steps,
                    manualTasks
                );
        }
    }

    private async Task<UpgradePullRequest> OpenPullRequest(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        IReadOnlyList<AppUpgradeStep> steps,
        IReadOnlyList<AppUpgradeManualTask> manualTasks
    )
    {
        string branchName = $"{_settings.BranchPrefix}{DateTime.UtcNow:yyyyMMdd-HHmmss}";
        _sourceControl.CreateLocalBranch(authenticatedContext, branchName);
        _sourceControl.CheckoutRepoOnBranch(authenticatedContext, branchName);
        _sourceControl.CommitToLocalRepo(authenticatedContext, _settings.CommitMessage);
        _sourceControl.PublishBranch(authenticatedContext, branchName);

        RepositoryClient.Model.Repository? repository = await _giteaClient.GetRepository(
            authenticatedContext.Org,
            authenticatedContext.Repo
        );
        string baseBranch = repository?.DefaultBranch ?? General.DefaultBranch;

        PullRequest? pullRequest = await _giteaClient.CreatePullRequestAsync(
            authenticatedContext.Org,
            authenticatedContext.Repo,
            new CreatePullRequestOption
            {
                Base = baseBranch,
                Head = branchName,
                Title = _settings.CommitMessage,
                Body = BuildPullRequestBody(steps, manualTasks),
            }
        );
        if (pullRequest is null)
        {
            _logger.LogWarning(
                "Pull request for {Org}/{Repo} from {Branch} into {Base} could not be created",
                authenticatedContext.Org,
                authenticatedContext.Repo,
                branchName,
                baseBranch
            );
        }

        return new UpgradePullRequest(branchName, pullRequest?.HtmlUrl);
    }

    private static string BuildPullRequestBody(
        IReadOnlyList<AppUpgradeStep> steps,
        IReadOnlyList<AppUpgradeManualTask> manualTasks
    )
    {
        var body = new StringBuilder();
        body.AppendLine($"Automatic upgrade to Altinn.App v{TargetMajorVersion} created by Altinn Studio.");
        body.AppendLine();
        if (manualTasks.Count > 0)
        {
            body.AppendLine("## Manual tasks before merging");
            body.AppendLine();
            foreach (AppUpgradeManualTask task in manualTasks)
            {
                body.AppendLine($"- [ ] **{task.Step}**: {task.Text}");
            }
            body.AppendLine();
        }

        body.AppendLine("<details><summary>Full upgrade report</summary>");
        body.AppendLine();
        foreach (AppUpgradeStep step in steps)
        {
            body.AppendLine($"### {step.Name}");
            foreach (AppUpgradeMessage message in step.Messages)
            {
                body.AppendLine($"- {message.Status}: {message.Text}");
            }
            body.AppendLine();
        }
        body.AppendLine("</details>");
        return body.ToString();
    }

    private sealed record UpgradePullRequest(string BranchName, string? Url);

    private void DiscardUpgradeChanges(AltinnRepoEditingContext editingContext)
    {
        try
        {
            _sourceControl.DiscardLocalChanges(editingContext);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Could not discard upgrade changes for {Org}/{Repo}",
                editingContext.Org,
                editingContext.Repo
            );
        }
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

    private static IReadOnlyList<AppUpgradeStep> MapSteps(IReadOnlyList<AppUpgradeEngineStep> steps) =>
        [
            .. steps.Select(step => new AppUpgradeStep(
                step.Name,
                [.. step.Messages.Select(message => new AppUpgradeMessage(message.Text, MapStatus(message.Status)))]
            )),
        ];

    private static AppUpgradeMessageStatus MapStatus(string wireStatus) =>
        wireStatus switch
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
}

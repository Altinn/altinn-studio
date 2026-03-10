using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Exceptions.SourceControl;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using LibGit2Sharp;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Implementation of the source control service.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="SourceControlService"/> class.
/// </remarks>
/// <param name="repositorySettings">The settings for the service repository.</param>
/// <param name="giteaClient">The gitea client.</param>
/// <param name="httpContextAccessor">The HTTP context accessor.</param>
public class SourceControlService(
    ServiceRepositorySettings repositorySettings,
    IGiteaClient giteaClient,
    IHttpContextAccessor? httpContextAccessor = null
) : ISourceControl
{
    private readonly ServiceRepositorySettings _repositorySettings = repositorySettings;
    private readonly IGiteaClient _giteaClient = giteaClient;
    private readonly IHttpContextAccessor? _httpContextAccessor = httpContextAccessor;

    private const string DefaultBranch = General.DefaultBranch;

    /// <inheritdoc/>
    public string CloneRemoteRepository(AltinnAuthenticatedRepoEditingContext authenticatedContext)
    {
        using var activity = StartActivity(authenticatedContext);
        return ExecuteWithTelemetry(
            activity,
            authenticatedContext,
            static (self, authenticatedContext) =>
            {
                string remoteRepo = self.FindRemoteRepoLocation(authenticatedContext.Org, authenticatedContext.Repo);
                CloneOptions cloneOptions = new();
                cloneOptions.FetchOptions.CredentialsProvider = GetCredentialsHandler(authenticatedContext);
                string localPath = self.FindLocalRepoLocation(authenticatedContext);
                string cloneResult = LibGit2Sharp.Repository.Clone(remoteRepo, localPath, cloneOptions);

                self.FetchGitNotes(authenticatedContext);
                return cloneResult;
            }
        );
    }

    /// <inheritdoc />
    public string CloneRemoteRepository(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string destinationPath,
        string branchName = ""
    )
    {
        using var activity = StartActivity(authenticatedContext);
        activity?.SetTag("destination.path", destinationPath);
        if (!string.IsNullOrEmpty(branchName))
        {
            activity?.SetTag("branch", branchName);
        }

        return ExecuteWithTelemetry(
            activity,
            (authenticatedContext, destinationPath, branchName),
            static (self, ctx) =>
            {
                string remoteRepo = self.FindRemoteRepoLocation(
                    ctx.authenticatedContext.Org,
                    ctx.authenticatedContext.Repo
                );
                CloneOptions cloneOptions = new();
                cloneOptions.FetchOptions.CredentialsProvider = GetCredentialsHandler(ctx.authenticatedContext);

                if (!string.IsNullOrEmpty(ctx.branchName))
                {
                    cloneOptions.BranchName = ctx.branchName;
                }

                string cloneResult = LibGit2Sharp.Repository.Clone(remoteRepo, ctx.destinationPath, cloneOptions);
                FetchGitNotesAtPath(ctx.destinationPath, ctx.authenticatedContext);
                return cloneResult;
            }
        );
    }

    /// <inheritdoc />
    public RepoStatus PullRemoteChanges(AltinnAuthenticatedRepoEditingContext authenticatedContext)
    {
        using var activity = StartActivity(authenticatedContext);
        return ExecuteWithTelemetry(
            activity,
            (activity, authenticatedContext),
            static (self, ctx) =>
            {
                RepoStatus status = new() { ContentStatus = [] };
                using var repo = new LibGit2Sharp.Repository(self.FindLocalRepoLocation(ctx.authenticatedContext));
                string headBranchBefore = repo.Head.FriendlyName;
                RepositoryStatus prePullStatus = repo.RetrieveStatus(new StatusOptions());
                bool isDirtyBefore = prePullStatus.IsDirty;
                int conflictCountBefore = repo.Index.Conflicts.Count();
                bool mergeConflict = false;
                bool checkoutConflict = false;
                int mergeConflictCount = 0;
                string mergeStatus = "unknown";
                PullOptions pullOptions = new()
                {
                    MergeOptions = new MergeOptions() { FastForwardStrategy = FastForwardStrategy.Default },
                    FetchOptions = new FetchOptions(),
                };
                pullOptions.FetchOptions.CredentialsProvider = GetCredentialsHandler(ctx.authenticatedContext);

                try
                {
                    Tree head = repo.Head.Tip.Tree;
                    MergeResult mergeResult = Commands.Pull(
                        repo,
                        self.GetDeveloperSignature(ctx.authenticatedContext.Developer),
                        pullOptions
                    );
                    mergeStatus = mergeResult.Status.ToString();

                    self.FetchGitNotes(ctx.authenticatedContext);
                    TreeChanges treeChanges = repo.Diff.Compare<TreeChanges>(head, mergeResult.Commit?.Tree);
                    foreach (TreeEntryChanges change in treeChanges.Modified)
                    {
                        status.ContentStatus.Add(
                            new RepositoryContent
                            {
                                FilePath = change.Path,
                                FileStatus = Enums.FileStatus.ModifiedInWorkdir,
                            }
                        );
                    }

                    if (mergeResult.Status == MergeStatus.Conflicts)
                    {
                        status.RepositoryStatus = Enums.RepositoryStatus.MergeConflict;
                        SetErrorStatus(ctx.activity, "merge_conflict");
                        mergeConflict = true;
                        mergeConflictCount = repo.Index.Conflicts.Count();
                    }
                }
                catch (CheckoutConflictException ex)
                {
                    status.RepositoryStatus = Enums.RepositoryStatus.CheckoutConflict;
                    ctx.activity?.AddException(ex);
                    SetErrorStatus(ctx.activity, "checkout_conflict");
                    checkoutConflict = true;
                }
                finally
                {
                    SetRepositoryStatusTag(ctx.activity, status.RepositoryStatus);
                    ctx.activity?.SetTag("pull.merge_status", mergeStatus);
                    self.AddActivityEvent(
                        "pull.summary",
                        new ActivityTagsCollection
                        {
                            { "head_branch_before", headBranchBefore },
                            { "head_branch_after", repo.Head.FriendlyName },
                            { "is_dirty_before", isDirtyBefore },
                            { "conflict_count_before", conflictCountBefore },
                            { "content_status_count", status.ContentStatus.Count },
                            { "merge_conflict", mergeConflict },
                            { "checkout_conflict", checkoutConflict },
                            { "merge_conflict_count", mergeConflictCount },
                            { "repo.path", repo.Info.WorkingDirectory },
                        }
                    );
                }
                return status;
            }
        );
    }

    /// <inheritdoc/>
    public void FetchRemoteChanges(AltinnAuthenticatedRepoEditingContext authenticatedContext)
    {
        using var activity = StartActivity(authenticatedContext);
        ExecuteWithTelemetry(
            activity,
            authenticatedContext,
            static (self, authenticatedContext) =>
            {
                string logMessage = string.Empty;
                using var repo = new LibGit2Sharp.Repository(self.FindLocalRepoLocation(authenticatedContext));
                FetchOptions fetchOptions = new() { CredentialsProvider = GetCredentialsHandler(authenticatedContext) };

                foreach (Remote remote in repo.Network.Remotes)
                {
                    IEnumerable<string> refSpecs = remote.FetchRefSpecs.Select(x => x.Specification);
                    Commands.Fetch(repo, remote.Name, refSpecs, fetchOptions, logMessage);
                }
            }
        );
    }

    /// <inheritdoc/>
    public void CommitAndPushChanges(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName,
        string localPath,
        string message
    )
    {
        using var activity = StartActivity(authenticatedContext);
        activity?.SetTag("branch", branchName);
        activity?.SetTag("local.path", localPath);

        ExecuteWithTelemetry(
            activity,
            (authenticatedContext, branchName, localPath, message),
            static (self, ctx) =>
                self.CommitAndPushToBranch(ctx.authenticatedContext, ctx.branchName, ctx.localPath, ctx.message)
        );
    }

    /// <inheritdoc/>
    public void PushChangesForRepository(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        CommitInfo commitInfo
    )
    {
        using var activity = StartActivity(authenticatedContext);
        ExecuteWithTelemetry(
            activity,
            (activity, authenticatedContext, commitInfo),
            static (self, ctx) =>
            {
                bool branchSupplied = !string.IsNullOrWhiteSpace(ctx.commitInfo.BranchName);
                ctx.activity?.SetTag("branch.supplied", branchSupplied);
                ctx.activity?.SetTag("commit.message.empty", string.IsNullOrWhiteSpace(ctx.commitInfo.Message));
                string branchName = string.Empty;
                string localServiceRepoFolder = string.Empty;
                try
                {
                    localServiceRepoFolder = self._repositorySettings.GetServicePath(
                        ctx.authenticatedContext.Org,
                        ctx.authenticatedContext.Repo,
                        ctx.authenticatedContext.Developer
                    );
                    branchName = ctx.commitInfo.BranchName;
                    if (!branchSupplied)
                    {
                        using LibGit2Sharp.Repository repo = new(localServiceRepoFolder);
                        branchName = repo.Head.FriendlyName;
                    }

                    self.CommitAndPushToBranch(
                        ctx.authenticatedContext,
                        branchName,
                        localServiceRepoFolder,
                        ctx.commitInfo.Message
                    );
                }
                finally
                {
                    ctx.activity?.SetTag("branch.resolved", branchName);
                }
            }
        );
    }

    /// <inheritdoc/>
    public bool Push(AltinnAuthenticatedRepoEditingContext authenticatedContext)
    {
        using var activity = StartActivity(authenticatedContext);
        return ExecuteWithTelemetry(
            activity,
            (activity, authenticatedContext),
            static (self, ctx) =>
            {
                bool pushSuccess = true;
                bool pushCompleted = false;
                int pushErrorCount = 0;
                bool remoteUrlUpdated = false;
                string remoteName = string.Empty;
                List<(string Reference, string Message)> pushErrors = [];
                try
                {
                    string localServiceRepoFolder = self._repositorySettings.GetServicePath(
                        ctx.authenticatedContext.Org,
                        ctx.authenticatedContext.Repo,
                        ctx.authenticatedContext.Developer
                    );
                    using LibGit2Sharp.Repository repo = new(localServiceRepoFolder);
                    string remoteUrl = self.FindRemoteRepoLocation(
                        ctx.authenticatedContext.Org,
                        ctx.authenticatedContext.Repo
                    );
                    Remote remote = repo.Network.Remotes["origin"];
                    remoteName = remote.Name;

                    if (!remote.PushUrl.Equals(remoteUrl))
                    {
                        // This is relevant when we switch beteen running designer in local or in docker. The remote URL changes.
                        // Requires adminstrator access to update files.
                        repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
                        remoteUrlUpdated = true;
                    }

                    PushOptions options = new()
                    {
                        OnPushStatusError = pushError =>
                        {
                            pushSuccess = false;
                            pushErrorCount++;
                            pushErrors.Add((pushError.Reference ?? string.Empty, pushError.Message ?? string.Empty));

                            SetErrorStatus(ctx.activity, "push_status_error");
                        },
                        CredentialsProvider = GetCredentialsHandler(ctx.authenticatedContext),
                    };

                    repo.Network.Push(remote, $"refs/heads/{DefaultBranch}", options);
                    repo.Network.Push(remote, "refs/notes/commits", options);
                    pushCompleted = true;
                    return pushSuccess;
                }
                finally
                {
                    ctx.activity?.SetTag("push.success", pushCompleted && pushSuccess);
                    ActivityTagsCollection summaryTags = new()
                    {
                        { "push_error_count", pushErrorCount },
                        { "remote", remoteName },
                        { "remote_url_updated", remoteUrlUpdated },
                        { "push_completed", pushCompleted },
                    };
                    AddIndexedPushErrors(summaryTags, pushErrors);
                    self.AddActivityEvent("push.summary", summaryTags);
                }
            }
        );
    }

    /// <inheritdoc/>
    public void Commit(CommitInfo commitInfo, AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        ExecuteWithTelemetry(
            activity,
            (editingContext, commitInfo),
            static (self, ctx) =>
                self.CommitAndAddStudioNote(
                    ctx.editingContext.Org,
                    ctx.editingContext.Repo,
                    ctx.editingContext.Developer,
                    ctx.commitInfo.Message
                )
        );
    }

    private void CommitAndAddStudioNote(string org, string repository, string developer, string message)
    {
        string localServiceRepoFolder = _repositorySettings.GetServicePath(org, repository, developer);
        using LibGit2Sharp.Repository repo = new(localServiceRepoFolder);
        string remoteUrl = FindRemoteRepoLocation(org, repository);
        Remote remote = repo.Network.Remotes["origin"];

        if (!remote.PushUrl.Equals(remoteUrl))
        {
            // This is relevant when we switch beteen running designer in local or in docker. The remote URL changes.
            // Requires adminstrator access to update files.
            repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
        }

        Commands.Stage(repo, "*");

        LibGit2Sharp.Signature signature = GetDeveloperSignature(developer);
        LibGit2Sharp.Commit commit = repo.Commit(message, signature, signature);

        NoteCollection notes = repo.Notes;
        notes.Add(commit.Id, "studio-commit", signature, signature, notes.DefaultNamespace);
    }

    /// <inheritdoc/>
    public List<RepositoryContent> Status(AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        return ExecuteWithTelemetry(
            activity,
            editingContext,
            static (self, editingContext) =>
            {
                List<RepositoryContent> repoContent = [];
                string localServiceRepoFolder = self._repositorySettings.GetServicePath(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );
                using var repo = new LibGit2Sharp.Repository(localServiceRepoFolder);
                RepositoryStatus status = repo.RetrieveStatus(new StatusOptions());
                foreach (StatusEntry item in status)
                {
                    RepositoryContent content = new()
                    {
                        FilePath = item.FilePath,
                        FileStatus = (Enums.FileStatus)item.State,
                    };
                    repoContent.Add(content);
                }

                return repoContent;
            }
        );
    }

    /// <inheritdoc/>
    public RepoStatus RepositoryStatus(AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        return ExecuteWithTelemetry(
            activity,
            (activity, editingContext),
            static (self, ctx) =>
            {
                RepoStatus repoStatus = new() { ContentStatus = [] };
                string localServiceRepoFolder = self._repositorySettings.GetServicePath(
                    ctx.editingContext.Org,
                    ctx.editingContext.Repo,
                    ctx.editingContext.Developer
                );
                using var repo = new LibGit2Sharp.Repository(localServiceRepoFolder);
                try
                {
                    RepositoryStatus status = repo.RetrieveStatus(new StatusOptions());
                    foreach (StatusEntry item in status)
                    {
                        RepositoryContent content = new();
                        content.FilePath = item.FilePath;
                        content.FileStatus = (Enums.FileStatus)(int)item.State;
                        if (content.FileStatus == Enums.FileStatus.Conflicted)
                        {
                            repoStatus.RepositoryStatus = Enums.RepositoryStatus.MergeConflict;
                            repoStatus.HasMergeConflict = true;
                        }

                        repoStatus.ContentStatus.Add(content);
                    }

                    Branch? branch = repo.Branches.FirstOrDefault(b => b.IsTracking);
                    if (branch != null)
                    {
                        repoStatus.AheadBy = branch.TrackingDetails.AheadBy;
                        repoStatus.BehindBy = branch.TrackingDetails.BehindBy;
                    }

                    repoStatus.CurrentBranch = repo.Head.FriendlyName;
                    return repoStatus;
                }
                finally
                {
                    SetRepositoryStatusTag(ctx.activity, repoStatus.RepositoryStatus);
                    self.AddActivityEvent(
                        "repo_status.summary",
                        new ActivityTagsCollection
                        {
                            { "current_branch", repoStatus.CurrentBranch },
                            { "content_status_count", repoStatus.ContentStatus.Count },
                            { "ahead_by", repoStatus.AheadBy ?? -1 },
                            { "behind_by", repoStatus.BehindBy ?? -1 },
                            { "repo.path", repo.Info.WorkingDirectory },
                        }
                    );
                }
            }
        );
    }

    /// <inheritdoc/>
    public Dictionary<string, string> GetChangedContent(AltinnAuthenticatedRepoEditingContext authenticatedContext)
    {
        using var activity = StartActivity(authenticatedContext);
        return ExecuteWithTelemetry(
            activity,
            authenticatedContext,
            static (self, authenticatedContext) =>
            {
                string localServiceRepoFolder = self._repositorySettings.GetServicePath(
                    authenticatedContext.Org,
                    authenticatedContext.Repo,
                    authenticatedContext.Developer
                );
                using var repo = new LibGit2Sharp.Repository(localServiceRepoFolder);
                Dictionary<string, string> fileDiffs = [];
                var currentBranchHeadCommit = repo.Head?.Tip;
                if (currentBranchHeadCommit == null)
                {
                    return fileDiffs;
                }

                TreeChanges changes = repo.Diff.Compare<TreeChanges>(
                    currentBranchHeadCommit.Tree,
                    DiffTargets.WorkingDirectory
                );
                foreach (TreeEntryChanges change in changes)
                {
                    Patch patch = repo.Diff.Compare<Patch>(
                        currentBranchHeadCommit.Tree,
                        DiffTargets.WorkingDirectory,
                        [change.Path]
                    );
                    fileDiffs[change.Path] = patch.Content;
                }

                return fileDiffs;
            }
        );
    }

    /// <inheritdoc/>
    public Designer.Models.Commit? GetLatestCommitForCurrentUser(AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        return ExecuteWithTelemetry(
            activity,
            editingContext,
            static (self, editingContext) =>
            {
                List<Designer.Models.Commit> commits = self.Log(editingContext);
                Designer.Models.Commit? latestCommit = commits.FirstOrDefault(commit =>
                    commit.Author.Name == editingContext.Developer
                );
                return latestCommit;
            }
        );
    }

    /// <inheritdoc/>
    public List<Designer.Models.Commit> Log(AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        return ExecuteWithTelemetry(
            activity,
            editingContext,
            static (self, editingContext) =>
            {
                List<Designer.Models.Commit> commits = [];
                string localServiceRepoFolder = self._repositorySettings.GetServicePath(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );
                using var repo = new LibGit2Sharp.Repository(localServiceRepoFolder);
                foreach (LibGit2Sharp.Commit c in repo.Commits.Take(50))
                {
                    Designer.Models.Commit commit = new()
                    {
                        Message = c.Message,
                        MessageShort = c.MessageShort,
                        Encoding = c.Encoding,
                        Sha = c.Sha,

                        Author = new Designer.Models.Signature
                        {
                            Name = c.Author.Name,
                            Email = c.Author.Email,
                            When = c.Author.When,
                        },

                        Comitter = new Designer.Models.Signature
                        {
                            Name = c.Committer.Name,
                            Email = c.Committer.Email,
                            When = c.Committer.When,
                        },
                    };

                    commits.Add(commit);
                }

                return commits;
            }
        );
    }

    /// <inheritdoc/>
    public void StoreAppTokenForUser(string token, string developer)
    {
        using var activity = StartActivity();
        activity?.SetTag("developer", developer);
        ExecuteWithTelemetry(
            activity,
            (token, developer),
            static (self, ctx) =>
            {
                self.CheckAndCreateDeveloperFolder(ctx.developer);

                string path = Path.Join(self._repositorySettings.RepositoryLocation, ctx.developer, "AuthToken.txt");
                File.WriteAllText(path, ctx.token);
            }
        );
    }

    /// <summary>
    /// Verifies if there exist a developer folder
    /// </summary>
    private void CheckAndCreateDeveloperFolder(string developer)
    {
        string path = Path.Join(_repositorySettings.RepositoryLocation, developer);

        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
    }

    public string FindLocalRepoLocation(AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        return ExecuteWithTelemetry(
            activity,
            editingContext,
            static (self, editingContext) =>
                Path.Join(
                    Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")
                        ?? self._repositorySettings.RepositoryLocation,
                    editingContext.Path
                )
        );
    }

    /// <inheritdoc />
    public void CloneIfNotExists(AltinnAuthenticatedRepoEditingContext authenticatedContext)
    {
        using var activity = StartActivity(authenticatedContext);
        ExecuteWithTelemetry(
            activity,
            (activity, authenticatedContext),
            static (self, ctx) =>
            {
                bool cloned = false;
                bool cloneFailedHandled = false;
                bool repoExistsBefore = false;
                string repoLocation = string.Empty;
                try
                {
                    repoLocation = self.FindLocalRepoLocation(ctx.authenticatedContext);
                    repoExistsBefore = Directory.Exists(repoLocation);
                    if (!repoExistsBefore)
                    {
                        try
                        {
                            self.CloneRemoteRepository(ctx.authenticatedContext);
                            cloned = true;
                        }
                        catch (Exception ex)
                        {
                            ctx.activity?.AddException(ex);
                            SetErrorStatus(ctx.activity, "clone_failed_ignored");
                            cloneFailedHandled = true;
                        }
                    }
                }
                finally
                {
                    ctx.activity?.SetTag("cloned", cloned);
                    ctx.activity?.SetTag("clone.failed_handled", cloneFailedHandled);
                    self.AddActivityEvent(
                        "clone_if_not_exists.summary",
                        new ActivityTagsCollection
                        {
                            { "repo.path", repoLocation },
                            { "repo_exists_before", repoExistsBefore },
                        }
                    );
                }
            }
        );
    }

    private void CommitAndPushToBranch(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName,
        string localPath,
        string message
    )
    {
        var activity = Activity.Current;
        using LibGit2Sharp.Repository repo = new(localPath);
        // Restrict users from empty commit
        var status = repo.RetrieveStatus();
        bool pushedDefaultBranch = false;
        bool pushedFeatureBranch = false;
        bool commitCreated = false;
        bool isDirty = status.IsDirty;
        string createdCommitSha = string.Empty;
        try
        {
            if (isDirty)
            {
                FetchGitNotes(authenticatedContext);
                string remoteUrl = FindRemoteRepoLocation(authenticatedContext.Org, authenticatedContext.Repo);
                Remote remote = repo.Network.Remotes["origin"];

                if (!remote.PushUrl.Equals(remoteUrl))
                {
                    // This is relevant when we switch between running designer in local or in docker. The remote URL changes.
                    // Requires administrator access to update files.
                    repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
                }

                Commands.Stage(repo, "*");

                LibGit2Sharp.Signature signature = GetDeveloperSignature(authenticatedContext.Developer);
                LibGit2Sharp.Commit commit = repo.Commit(message, signature, signature);
                commitCreated = true;
                createdCommitSha = commit.Sha;
                NoteCollection notes = repo.Notes;
                notes.Add(commit.Id, "studio-commit", signature, signature, notes.DefaultNamespace);

                PushOptions options = new() { CredentialsProvider = GetCredentialsHandler(authenticatedContext) };

                if (branchName == DefaultBranch)
                {
                    repo.Network.Push(remote, $"refs/heads/{DefaultBranch}", options);
                    repo.Network.Push(remote, "refs/notes/commits", options);
                    pushedDefaultBranch = true;
                }
                else
                {
                    Branch b = repo.Branches[branchName];
                    repo.Network.Push(b, options);
                    repo.Network.Push(remote, "refs/notes/commits", options);
                    pushedFeatureBranch = true;
                }
            }
        }
        finally
        {
            activity?.SetTag("commit.is_dirty", isDirty);
            activity?.SetTag("commit.created", commitCreated);
            activity?.SetTag(
                "commit.push_target",
                pushedDefaultBranch ? "default"
                    : pushedFeatureBranch ? "feature"
                    : "none"
            );
            AddActivityEvent(
                "commit_and_push_to_branch.summary",
                new ActivityTagsCollection { { "created_commit_sha", createdCommitSha }, { "local.path", localPath } }
            );
        }
    }

    /// <inheritdoc/>
    public void PublishBranch(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName)
    {
        using var activity = StartActivity(authenticatedContext);
        activity?.SetTag("branch", branchName);
        ExecuteWithTelemetry(
            activity,
            (authenticatedContext, branchName),
            static (self, ctx) =>
            {
                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.authenticatedContext);
                string remoteUrl = self.FindRemoteRepoLocation(
                    ctx.authenticatedContext.Org,
                    ctx.authenticatedContext.Repo
                );
                Remote remote = repo.Network.Remotes["origin"];
                if (!remote.PushUrl.Equals(remoteUrl))
                {
                    // This is relevant when we switch between running designer in local or in docker. The remote URL changes.
                    // Requires administrator access to update files.
                    repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
                }

                Branch branch =
                    repo.Branches[ctx.branchName]
                    ?? throw new BranchNotFoundException(
                        $"Branch '{ctx.branchName}' not found in local repository. Cannot publish non-existing branch."
                    );

                repo.Branches.Update(
                    branch,
                    updater =>
                    {
                        updater.Remote = "origin";
                        updater.UpstreamBranch = $"refs/heads/{ctx.branchName}";
                    }
                );
                PushOptions options = new() { CredentialsProvider = GetCredentialsHandler(ctx.authenticatedContext) };
                repo.Network.Push(branch, options);
                repo.Network.Push(remote, "refs/notes/commits", options);
            }
        );
    }

    /// <inheritdoc/>
    public void CommitToLocalRepo(AltinnRepoEditingContext editingContext, string message)
    {
        using var activity = StartActivity(editingContext);
        ExecuteWithTelemetry(
            activity,
            (editingContext, message, activity),
            static (self, ctx) =>
            {
                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.editingContext);
                string developer = ctx.editingContext.Developer;

                var status = repo.RetrieveStatus();
                ctx.activity?.SetTag("is_dirty", status.IsDirty);
                if (status.IsDirty)
                {
                    string commitMessage = ctx.message ?? string.Empty;
                    string noteMessage = "studio-commit";
                    LibGit2Sharp.Signature signature = self.GetDeveloperSignature(developer);

                    CommandsExtensions.StageAllChanges(repo);
                    LibGit2Sharp.Commit commit = repo.Commit(commitMessage, signature, signature);
                    NoteCollection notes = repo.Notes;
                    notes.Add(commit.Id, noteMessage, signature, signature, notes.DefaultNamespace);
                }
            }
        );
    }

    /// <inheritdoc/>
    public RebaseResult RebaseOntoDefaultBranch(AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        return ExecuteWithTelemetry(
            activity,
            (activity, editingContext),
            static (self, ctx) =>
            {
                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.editingContext);
                RebaseStatus rebaseStatus = default;
                bool conflictsAborted = false;
                bool stopAborted = false;

                Identity identity = GetDefaultIdentity(ctx.editingContext.Developer);
                RebaseOptions rebaseOptions = new() { FileConflictStrategy = CheckoutFileConflictStrategy.Ours };

                Branch upstream =
                    repo.Branches.FirstOrDefault(b => b.FriendlyName.Equals(DefaultBranch))
                    ?? throw new InvalidOperationException($"Default branch '{DefaultBranch}' not found locally.");

                try
                {
                    RebaseResult rebaseResult = repo.Rebase.Start(repo.Head, upstream, null, identity, rebaseOptions);
                    rebaseStatus = rebaseResult.Status;

                    if (rebaseResult.Status == RebaseStatus.Conflicts)
                    {
                        repo.Rebase.Abort();
                        conflictsAborted = true;
                        SetErrorStatus(ctx.activity, "rebase_conflicts");
                    }

                    if (rebaseResult.Status == RebaseStatus.Stop)
                    {
                        repo.Rebase.Abort();
                        stopAborted = true;
                        SetErrorStatus(ctx.activity, "rebase_stopped");
                        throw new InvalidOperationException(
                            "Rebase onto latest commit on default branch was stopped by user."
                        ); // Should be unreachable code.
                    }

                    return rebaseResult;
                }
                finally
                {
                    ctx.activity?.SetTag("rebase.status", rebaseStatus.ToString());
                    self.AddActivityEvent(
                        "rebase.summary",
                        new ActivityTagsCollection
                        {
                            { "working_directory", repo.Info.WorkingDirectory },
                            { "conflicts_aborted", conflictsAborted },
                            { "stop_aborted", stopAborted },
                        }
                    );
                }
            }
        );
    }

    /// <inheritdoc/>
    public void CreateLocalBranch(AltinnRepoEditingContext editingContext, string branchName, string commitSha = null!)
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag("branch", branchName);
        activity?.SetTag("commit.sha", commitSha);
        ExecuteWithTelemetry(
            activity,
            (editingContext, branchName, commitSha),
            static (self, ctx) =>
            {
                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.editingContext);

                Branch? branch = repo.Branches.FirstOrDefault(branch => branch.FriendlyName == ctx.branchName);
                if (branch is not null)
                {
                    return;
                }

                if (ctx.commitSha is null)
                {
                    repo.CreateBranch(ctx.branchName);
                    return;
                }

                LibGit2Sharp.Commit? commit = repo.Lookup<LibGit2Sharp.Commit>(ctx.commitSha);
                if (commit is null)
                {
                    throw new ArgumentException(
                        $"Commit '{ctx.commitSha}' not found in repository.",
                        nameof(ctx.commitSha)
                    );
                }

                repo.CreateBranch(ctx.branchName, commit);
            }
        );
    }

    public void DeleteRemoteBranchIfExists(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName
    )
    {
        using var activity = StartActivity(authenticatedContext);
        activity?.SetTag("branch", branchName);
        ExecuteWithTelemetry(
            activity,
            (activity, authenticatedContext, branchName),
            static (self, ctx) =>
            {
                self.FetchRemoteChanges(ctx.authenticatedContext);

                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.authenticatedContext);
                if (RemoteBranchExists(ctx.branchName, repo) is false)
                {
                    ctx.activity?.SetTag("branch.deleted", false);
                    return;
                }

                Remote remote = repo.Network.Remotes["origin"];
                PushOptions options = new() { CredentialsProvider = GetCredentialsHandler(ctx.authenticatedContext) };
                string pushRefSpec = $":refs/heads/{ctx.branchName}";
                repo.Network.Push(remote, pushRefSpec, options);
                ctx.activity?.SetTag("branch.deleted", true);
            }
        );
    }

    /// <inheritdoc/>
    public void DeleteLocalBranchIfExists(AltinnRepoEditingContext editingContext, string branchName)
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag("branch", branchName);
        ExecuteWithTelemetry(
            activity,
            (activity, editingContext, branchName),
            static (self, ctx) =>
            {
                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.editingContext);

                if (LocalBranchIsHead(repo, ctx.branchName))
                {
                    string defaultBranchName = repo
                        .Branches.Single(branch => branch.FriendlyName == DefaultBranch)
                        .FriendlyName;
                    self.CheckoutRepoOnBranch(ctx.editingContext, defaultBranchName);
                }

                if (LocalBranchExists(repo, ctx.branchName))
                {
                    repo.Branches.Remove(ctx.branchName);
                    ctx.activity?.SetTag("branch.deleted", true);
                    return;
                }

                ctx.activity?.SetTag("branch.deleted", false);
            }
        );
    }

    /// <inheritdoc/>
    public void CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName)
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag("branch", branchName);
        ExecuteWithTelemetry(
            activity,
            (editingContext, branchName),
            static (self, ctx) =>
            {
                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.editingContext);

                Branch? branch = repo.Branches.FirstOrDefault(b => b.FriendlyName == ctx.branchName);
                if (branch == null)
                {
                    Branch? remoteBranch = repo.Branches.FirstOrDefault(b =>
                        b.IsRemote
                        && (
                            b.FriendlyName == $"origin/{ctx.branchName}"
                            || b.FriendlyName.EndsWith($"/{ctx.branchName}")
                        )
                    );

                    if (remoteBranch != null)
                    {
                        branch = repo.CreateBranch(ctx.branchName, remoteBranch.Tip);
                        branch = repo.Branches.Update(branch, b => b.TrackedBranch = remoteBranch.CanonicalName);
                    }
                    else
                    {
                        throw new InvalidOperationException(
                            $"Branch '{ctx.branchName}' not found in local or remote branches."
                        );
                    }
                }

                Commands.Checkout(repo, branch);
            }
        );
    }

    /// <inheritdoc/>
    public void MergeBranchIntoHead(AltinnRepoEditingContext editingContext, string featureBranch)
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag("feature.branch", featureBranch);
        ExecuteWithTelemetry(
            activity,
            (editingContext, featureBranch),
            static (self, ctx) =>
            {
                string localPath = self.FindLocalRepoLocation(ctx.editingContext);
                using LibGit2Sharp.Repository repo = new(localPath);

                Branch branch = repo.Branches.Single(branch => branch.FriendlyName == ctx.featureBranch);
                LibGit2Sharp.Signature signature = self.GetDeveloperSignature(ctx.editingContext.Developer);
                MergeResult result = repo.Merge(branch, signature);
                if (result.Status == MergeStatus.Conflicts)
                {
                    repo.Reset(ResetMode.Hard, repo.Head.Tip);
                    throw new InvalidOperationException("Merge failed; repository reset to pre-merge HEAD.");
                }
            }
        );
    }

    /// <inheritdoc/>
    public CurrentBranchInfo GetCurrentBranch(AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        return ExecuteWithTelemetry(
            activity,
            editingContext,
            static (self, editingContext) =>
            {
                string localPath = self._repositorySettings.GetServicePath(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );

                using LibGit2Sharp.Repository repo = new(localPath);
                return new CurrentBranchInfo
                {
                    BranchName = repo.Head.FriendlyName,
                    CommitSha = repo.Head.Tip?.Sha,
                    IsTracking = repo.Head.IsTracking,
                    RemoteName = repo.Head.TrackedBranch?.FriendlyName,
                };
            }
        );
    }

    /// <inheritdoc/>
    public RepoStatus CheckoutBranchWithValidation(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName
    )
    {
        using var activity = StartActivity(authenticatedContext);
        activity?.SetTag("target.branch", branchName);
        return ExecuteWithTelemetry(
            activity,
            (activity, authenticatedContext, branchName),
            static (self, ctx) =>
            {
                RepoStatus repoStatus = self.RepositoryStatus(ctx.authenticatedContext);
                SetRepositoryStatusTag(ctx.activity, repoStatus.RepositoryStatus);
                AltinnRepoEditingContext editingContext = ctx.authenticatedContext.RepoEditingContext;

                bool hasUncommittedChanges = repoStatus.ContentStatus.Any(c =>
                    c.FileStatus != Enums.FileStatus.Unaltered
                );

                if (hasUncommittedChanges)
                {
                    var error = new UncommittedChangesError
                    {
                        Error = "Cannot switch branches with uncommitted changes",
                        Message =
                            "You have uncommitted changes. Please commit and push your changes, or discard them before switching branches.",
                        UncommittedFiles = repoStatus
                            .ContentStatus.Where(c => c.FileStatus != Enums.FileStatus.Unaltered)
                            .Select(c => new UncommittedFile
                            {
                                FilePath = c.FilePath,
                                Status = c.FileStatus.ToString(),
                            })
                            .ToList(),
                        CurrentBranch = repoStatus.CurrentBranch,
                        TargetBranch = ctx.branchName,
                    };

                    ctx.activity?.SetTag("checkout.blocked", true);
                    throw new Exceptions.UncommittedChangesException(error);
                }

                self.FetchRemoteChanges(ctx.authenticatedContext);
                self.CheckoutRepoOnBranch(editingContext, ctx.branchName);
                RepoStatus updatedRepoStatus = self.RepositoryStatus(editingContext);
                SetRepositoryStatusTag(ctx.activity, updatedRepoStatus.RepositoryStatus);
                return updatedRepoStatus;
            }
        );
    }

    /// <inheritdoc/>
    public RepoStatus DiscardLocalChanges(AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        return ExecuteWithTelemetry(
            activity,
            (activity, editingContext),
            static (self, ctx) =>
            {
                string localPath = self._repositorySettings.GetServicePath(
                    ctx.editingContext.Org,
                    ctx.editingContext.Repo,
                    ctx.editingContext.Developer
                );

                using (var repo = new LibGit2Sharp.Repository(localPath))
                {
                    repo.Reset(ResetMode.Hard, repo.Head.Tip);
                    repo.RemoveUntrackedFiles();
                }

                RepoStatus repoStatus = self.RepositoryStatus(ctx.editingContext);
                SetRepositoryStatusTag(ctx.activity, repoStatus.RepositoryStatus);
                return repoStatus;
            }
        );
    }

    /// <summary>
    /// Returns the remote repo
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="repository">The name of the repository</param>
    /// <returns>The path to the remote repo</returns>
    private string FindRemoteRepoLocation(string org, string repository)
    {
        return new Uri(_repositorySettings.RepositoryBaseURL).Append($"{org}/{repository}.git").ToString();
    }

    /// <inheritdoc/>
    public void StageChange(AltinnRepoEditingContext editingContext, string fileName)
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag("file.path", fileName);
        ExecuteWithTelemetry(
            activity,
            (activity, editingContext, fileName),
            static (self, ctx) =>
            {
                string localServiceRepoFolder = self._repositorySettings.GetServicePath(
                    ctx.editingContext.Org,
                    ctx.editingContext.Repo,
                    ctx.editingContext.Developer
                );
                using LibGit2Sharp.Repository repo = new(localServiceRepoFolder);
                var matchingFile = repo.RetrieveStatus().SingleOrDefault(file => file.FilePath == ctx.fileName);
                if (matchingFile is null)
                {
                    ctx.activity?.SetTag("file.staged", false);
                    return;
                }

                FileStatus fileStatus = matchingFile.State;
                if (
                    fileStatus == FileStatus.ModifiedInWorkdir
                    || fileStatus == FileStatus.NewInWorkdir
                    || fileStatus == FileStatus.Conflicted
                )
                {
                    Commands.Stage(repo, ctx.fileName);
                    ctx.activity?.SetTag("file.staged", true);
                    return;
                }

                ctx.activity?.SetTag("file.staged", false);
            }
        );
    }

    /// <inheritdoc/>
    public async Task<RepositoryClient.Model.Branch> CreateBranch(
        AltinnRepoEditingContext editingContext,
        string branchName
    )
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag("branch", branchName);
        return await ExecuteWithTelemetryAsync(
            activity,
            (editingContext, branchName),
            static (self, ctx) =>
                self._giteaClient.CreateBranch(ctx.editingContext.Org, ctx.editingContext.Repo, ctx.branchName)
        );
    }

    /// <inheritdoc/>
    public async Task<bool> CreatePullRequest(
        AltinnRepoEditingContext editingContext,
        string target,
        string source,
        string title
    )
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag("target.branch", target);
        activity?.SetTag("source.branch", source);

        return await ExecuteWithTelemetryAsync(
            activity,
            (editingContext, target, source, title),
            static async (self, ctx) =>
            {
                CreatePullRequestOption option = new()
                {
                    Base = ctx.target,
                    Head = ctx.source,
                    Title = ctx.title,
                };

                return await self._giteaClient.CreatePullRequest(
                    ctx.editingContext.Org,
                    ctx.editingContext.Repo,
                    option
                );
            }
        );
    }

    /// <inheritdoc/>
    public async Task DeleteRepository(AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        await ExecuteWithTelemetryAsync(
            activity,
            editingContext,
            static async (self, editingContext) =>
            {
                string localServiceRepoFolder = self._repositorySettings.GetServicePath(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );

                if (Directory.Exists(localServiceRepoFolder))
                {
                    DirectoryHelper.DeleteFilesAndDirectory(localServiceRepoFolder);
                }

                await self._giteaClient.DeleteRepository(editingContext.Org, editingContext.Repo);
            }
        );
    }

    private static bool LocalBranchExists(LibGit2Sharp.Repository repo, string branchName)
    {
        return repo.Branches.Any(branch => branch.FriendlyName == branchName);
    }

    private static bool LocalBranchIsHead(LibGit2Sharp.Repository repo, string branchName)
    {
        return repo.Head.FriendlyName == branchName;
    }

    private static bool RemoteBranchExists(string branchName, LibGit2Sharp.Repository repo)
    {
        string remoteBranchName = $"refs/remotes/origin/{branchName}";
        Branch remoteBranch = repo.Branches[remoteBranchName];

        if (remoteBranch is null)
        {
            return false;
        }

        return remoteBranch.IsRemote;
    }

    private LibGit2Sharp.Signature GetDeveloperSignature(string developer)
    {
        return new LibGit2Sharp.Signature(developer, $"{developer}@noreply.altinn.studio", DateTime.Now);
    }

    private static Identity GetDefaultIdentity(string developer)
    {
        string email = $"{developer}@noreply.altinn.studio";
        return new Identity(developer, email);
    }

    private LibGit2Sharp.Repository CreateLocalRepo(AltinnRepoEditingContext editingContext)
    {
        string localPath = FindLocalRepoLocation(editingContext);
        return new LibGit2Sharp.Repository(localPath);
    }

    private static LibGit2Sharp.Handlers.CredentialsHandler GetCredentialsHandler(
        AltinnAuthenticatedRepoEditingContext authenticatedContext
    )
    {
        return (url, user, cred) =>
            new UsernamePasswordCredentials
            {
                Username = authenticatedContext.DeveloperAppToken,
                Password = string.Empty,
            };
    }

    public void FetchGitNotes(AltinnAuthenticatedRepoEditingContext authenticatedContext)
    {
        using var activity = StartActivity(authenticatedContext);
        ExecuteWithTelemetry(
            activity,
            authenticatedContext,
            static (self, authenticatedContext) =>
                FetchGitNotesAtPath(self.FindLocalRepoLocation(authenticatedContext), authenticatedContext)
        );
    }

    private static void FetchGitNotesAtPath(
        string localRepositoryPath,
        AltinnAuthenticatedRepoEditingContext authenticatedContext
    )
    {
        using LibGit2Sharp.Repository repo = new(localRepositoryPath);
        FetchOptions options = new() { CredentialsProvider = GetCredentialsHandler(authenticatedContext) };
        Commands.Fetch(repo, "origin", ["refs/notes/*:refs/notes/*"], options, "fetch notes");
    }

    private static Activity? StartActivityCore(string methodName) =>
        ServiceTelemetry.Source.StartActivity($"{nameof(SourceControlService)}.{methodName}");

    private static Activity? StartActivity([CallerMemberName] string methodName = "") => StartActivityCore(methodName);

    private static Activity? StartActivity(
        AltinnRepoEditingContext editingContext,
        [CallerMemberName] string methodName = ""
    )
    {
        var activity = StartActivityCore(methodName);
        SetCommonTags(activity, editingContext.Org, editingContext.Repo, editingContext.Developer);
        return activity;
    }

    private static Activity? StartActivity(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        [CallerMemberName] string methodName = ""
    )
    {
        var activity = StartActivityCore(methodName);
        SetCommonTags(activity, authenticatedContext.Org, authenticatedContext.Repo, authenticatedContext.Developer);
        return activity;
    }

    private static void SetCommonTags(Activity? activity, string org, string repository, string developer)
    {
        activity?.SetTag("org", org);
        activity?.SetTag("repository", repository);
        activity?.SetTag("developer", developer);
    }

    private static void SetErrorStatus(Activity? activity, string description) =>
        activity?.SetStatus(ActivityStatusCode.Error, description);

    private static void RecordException(Activity? activity, Exception exception)
    {
        activity?.AddException(exception);
        SetErrorStatus(activity, exception.GetType().Name);
    }

    private static void SetRepositoryStatusTag(Activity? activity, Enums.RepositoryStatus repositoryStatus) =>
        activity?.SetTag("repository_status", repositoryStatus.ToString());

    private void AddActivityEvent(string eventName, ActivityTagsCollection? tags = null)
    {
        var activity =
            _httpContextAccessor?.HttpContext?.Features.Get<IHttpActivityFeature>()?.Activity ?? Activity.Current;
        activity?.AddEvent(new ActivityEvent(eventName, tags: tags));
    }

    private static void AddIndexedPushErrors(
        ActivityTagsCollection tags,
        IReadOnlyList<(string Reference, string Message)> pushErrors
    )
    {
        for (int i = 0; i < pushErrors.Count; i++)
        {
            tags.Add($"push_error_{i}_reference", pushErrors[i].Reference);
            tags.Add($"push_error_{i}_message", pushErrors[i].Message);
        }
    }

    private TReturn ExecuteWithTelemetry<TContext, TReturn>(
        Activity? activity,
        TContext context,
        Func<SourceControlService, TContext, TReturn> action
    )
    {
        try
        {
            TReturn result = action(this, context);
            return result;
        }
        catch (Exception ex)
        {
            RecordException(activity, ex);
            throw;
        }
    }

    private void ExecuteWithTelemetry<TContext>(
        Activity? activity,
        TContext context,
        Action<SourceControlService, TContext> action
    )
    {
        try
        {
            action(this, context);
        }
        catch (Exception ex)
        {
            RecordException(activity, ex);
            throw;
        }
    }

    private async Task<TReturn> ExecuteWithTelemetryAsync<TContext, TReturn>(
        Activity? activity,
        TContext context,
        Func<SourceControlService, TContext, Task<TReturn>> action
    )
    {
        try
        {
            TReturn result = await action(this, context);
            return result;
        }
        catch (Exception ex)
        {
            RecordException(activity, ex);
            throw;
        }
    }

    private async Task ExecuteWithTelemetryAsync<TContext>(
        Activity? activity,
        TContext context,
        Func<SourceControlService, TContext, Task> action
    )
    {
        try
        {
            await action(this, context);
        }
        catch (Exception ex)
        {
            RecordException(activity, ex);
            throw;
        }
    }
}

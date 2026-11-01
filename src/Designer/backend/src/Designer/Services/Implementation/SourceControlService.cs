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
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using LibGit2Sharp;

namespace Altinn.Studio.Designer.Services.Implementation;

/// <summary>
/// Implementation of the source control service.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="SourceControlService"/> class.
/// </remarks>
/// <param name="repositorySettings">The settings for the service repository.</param>
/// <param name="giteaClient">The gitea client.</param>
/// <param name="authHeadersProvider">The git server auth headers provider.</param>
public class SourceControlService(
    ServiceRepositorySettings repositorySettings,
    IGiteaClient giteaClient,
    IGitServerAuthHeadersProvider authHeadersProvider
) : ISourceControl
{
    private readonly ServiceRepositorySettings _repositorySettings = repositorySettings;
    private readonly IGiteaClient _giteaClient = giteaClient;

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
                cloneOptions.FetchOptions.CredentialsProvider = self.GetCredentialsHandler(authenticatedContext);
                cloneOptions.FetchOptions.CustomHeaders = self.GetAuthCustomHeaders(authenticatedContext);
                string localPath = self.FindLocalRepoLocation(authenticatedContext);
                return LibGit2Sharp.Repository.Clone(remoteRepo, localPath, cloneOptions);
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
        if (!string.IsNullOrEmpty(branchName))
        {
            activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, branchName);
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
                cloneOptions.FetchOptions.CredentialsProvider = self.GetCredentialsHandler(ctx.authenticatedContext);
                cloneOptions.FetchOptions.CustomHeaders = self.GetAuthCustomHeaders(ctx.authenticatedContext);

                if (!string.IsNullOrEmpty(ctx.branchName))
                {
                    cloneOptions.BranchName = ctx.branchName;
                }

                return LibGit2Sharp.Repository.Clone(remoteRepo, ctx.destinationPath, cloneOptions);
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

                try
                {
                    Tree head = repo.Head.Tip.Tree;
                    if (conflictCountBefore > 0)
                    {
                        // A share or pull that met conflicts left them in the working directory for the user.
                        status.RepositoryStatus = Enums.RepositoryStatus.MergeConflict;
                        SetErrorStatus(ctx.activity, "merge_conflict");
                        mergeConflict = true;
                        mergeConflictCount = conflictCountBefore;
                        return status;
                    }

                    Infrastructure.GitRepository.LibGit2Configuration.AssertSymbolicLinksDisabled(repo.Config);
                    self.FetchRemoteChanges(repo, ctx.authenticatedContext);
                    Branch upstream =
                        repo.Branches[$"refs/remotes/origin/{headBranchBefore}"]
                        ?? throw new BranchNotFoundException(
                            $"Remote branch 'origin/{headBranchBefore}' not found locally."
                        );
                    HistoryDivergence? divergence = repo.ObjectDatabase.CalculateHistoryDivergence(
                        repo.Head.Tip,
                        upstream.Tip
                    );
                    int behindBy = divergence?.BehindBy ?? 0;
                    int aheadBy = divergence?.AheadBy ?? 0;

                    if (behindBy == 0)
                    {
                        mergeStatus = MergeStatus.UpToDate.ToString();
                        return status;
                    }

                    if (aheadBy > 0)
                    {
                        if (isDirtyBefore)
                        {
                            // Sharing brings in the remote changes together with the uncommitted ones.
                            status.RepositoryStatus = Enums.RepositoryStatus.CheckoutConflict;
                            SetErrorStatus(ctx.activity, "checkout_conflict");
                            checkoutConflict = true;
                            return status;
                        }

                        CombineResult combineResult = self.CombineWithRemoteBranch(
                            ctx.authenticatedContext,
                            headBranchBefore
                        );

                        if (combineResult.HasConflicts)
                        {
                            mergeStatus = MergeStatus.Conflicts.ToString();
                            status.RepositoryStatus = Enums.RepositoryStatus.MergeConflict;
                            SetErrorStatus(ctx.activity, "merge_conflict");
                            mergeConflict = true;
                            return status;
                        }

                        mergeStatus = "Combined";
                        status.ContentStatus.AddRange(combineResult.ContentStatus);
                        return status;
                    }

                    // Fast-forwards to the commit the divergence was computed from. Pulling would fetch again, and a
                    // push to origin in between would turn this into a merge commit.
                    MergeResult mergeResult = repo.Merge(
                        upstream.Tip,
                        self.GetDeveloperSignature(ctx.authenticatedContext.Developer),
                        new MergeOptions { FastForwardStrategy = FastForwardStrategy.FastForwardOnly }
                    );
                    mergeStatus = mergeResult.Status.ToString();

                    PopulateContentStatusFromCommitDiff(repo, head, mergeResult.Commit?.Tree, status.ContentStatus);
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
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PullMergeStatus, mergeStatus);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PullHeadBranchBefore, headBranchBefore);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PullHeadBranchAfter, repo.Head.FriendlyName);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PullIsDirtyBefore, isDirtyBefore);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PullConflictCountBefore, conflictCountBefore);
                    ctx.activity?.SetTag(
                        ServiceTelemetry.Attributes.Git.ContentStatusCount,
                        status.ContentStatus.Count
                    );
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PullMergeConflict, mergeConflict);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PullCheckoutConflict, checkoutConflict);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PullMergeConflictCount, mergeConflictCount);
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
                self.FetchRemoteChanges(repo, authenticatedContext, logMessage);
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
        activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, branchName);

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
                ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.BranchSupplied, branchSupplied);
                ctx.activity?.SetTag(
                    ServiceTelemetry.Attributes.Git.CommitMessageEmpty,
                    string.IsNullOrWhiteSpace(ctx.commitInfo.Message)
                );
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
                        branchName = repo.Head.Tip is null ? DefaultBranch : repo.Head.FriendlyName;
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
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, branchName);
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
                        // This is relevant when we switch between running designer in local or in docker. The remote URL changes.
                        // Requires administrator access to update files.
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
                        CredentialsProvider = self.GetCredentialsHandler(ctx.authenticatedContext),
                        CustomHeaders = self.GetAuthCustomHeaders(ctx.authenticatedContext),
                    };

                    repo.Network.Push(remote, $"refs/heads/{DefaultBranch}", options);
                    pushCompleted = true;
                    return pushSuccess;
                }
                finally
                {
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PushSuccess, pushCompleted && pushSuccess);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PushErrorCount, pushErrorCount);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PushRemote, remoteName);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PushRemoteUrlUpdated, remoteUrlUpdated);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.PushCompleted, pushCompleted);
                    if (pushErrors.Count > 0)
                    {
                        ctx.activity?.SetTag(
                            ServiceTelemetry.Attributes.Git.PushErrorReferences,
                            pushErrors.Select(error => error.Reference).ToArray()
                        );
                        ctx.activity?.SetTag(
                            ServiceTelemetry.Attributes.Git.PushErrorMessages,
                            pushErrors.Select(error => error.Message).ToArray()
                        );
                    }
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
                self.CommitAllChanges(
                    ctx.editingContext.Org,
                    ctx.editingContext.Repo,
                    ctx.editingContext.Developer,
                    ctx.commitInfo.Message
                )
        );
    }

    private void CommitAllChanges(string org, string repository, string developer, string message)
    {
        string localServiceRepoFolder = _repositorySettings.GetServicePath(org, repository, developer);
        using LibGit2Sharp.Repository repo = new(localServiceRepoFolder);
        string remoteUrl = FindRemoteRepoLocation(org, repository);
        Remote remote = repo.Network.Remotes["origin"];

        if (!remote.PushUrl.Equals(remoteUrl))
        {
            // This is relevant when we switch between running designer in local or in docker. The remote URL changes.
            // Requires administrator access to update files.
            repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
        }

        Commands.Stage(repo, "*");

        LibGit2Sharp.Signature signature = GetDeveloperSignature(developer);
        repo.Commit(message, signature, signature);
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
                    IReadOnlyList<(string FilePath, FileStatus State)>? status = repo.RetrieveStatusUpdatingIndex(
                        out string? indexUpdateFailure
                    );
                    if (status is null)
                    {
                        ctx.activity?.SetTag(
                            ServiceTelemetry.Attributes.Git.StatusIndexUpdateFailure,
                            indexUpdateFailure
                        );
                        status = repo.RetrieveStatus(new StatusOptions())
                            .Select(item => (item.FilePath, item.State))
                            .ToList();
                    }

                    foreach ((string filePath, FileStatus state) in status)
                    {
                        RepositoryContent content = new();
                        content.FilePath = filePath;
                        content.FileStatus = (Enums.FileStatus)(int)state;
                        if (content.FileStatus == Enums.FileStatus.Conflicted)
                        {
                            repoStatus.RepositoryStatus = Enums.RepositoryStatus.MergeConflict;
                            repoStatus.HasMergeConflict = true;
                        }

                        repoStatus.ContentStatus.Add(content);
                    }

                    Branch head = repo.Head;
                    if (head.IsTracking)
                    {
                        // Each TrackingDetails compares the histories again.
                        BranchTrackingDetails trackingDetails = head.TrackingDetails;
                        repoStatus.AheadBy = trackingDetails.AheadBy;
                        repoStatus.BehindBy = trackingDetails.BehindBy;
                    }

                    repoStatus.CurrentBranch = head.FriendlyName;
                    return repoStatus;
                }
                finally
                {
                    SetRepositoryStatusTag(ctx.activity, repoStatus.RepositoryStatus);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, repoStatus.CurrentBranch);
                    ctx.activity?.SetTag(
                        ServiceTelemetry.Attributes.Git.ContentStatusCount,
                        repoStatus.ContentStatus.Count
                    );
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.AheadBy, repoStatus.AheadBy);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.BehindBy, repoStatus.BehindBy);
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

                        Committer = new Designer.Models.Signature
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

    public string FindLocalRepoLocation(AltinnRepoEditingContext editingContext) =>
        Path.Join(
            Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")
                ?? _repositorySettings.RepositoryLocation,
            editingContext.Path
        );

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
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.CloneCloned, cloned);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.CloneFailureHandled, cloneFailedHandled);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.CloneRepoExisted, repoExistsBefore);
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
        string pushedBranchName = string.Empty;
        bool commitCreated = false;
        bool isDirty = status.IsDirty;
        string createdCommitSha = string.Empty;
        try
        {
            if (isDirty)
            {
                EnsureUnbornHeadPointsToBranch(repo, branchName);
                Commands.Stage(repo, "*");

                LibGit2Sharp.Signature signature = GetDeveloperSignature(authenticatedContext.Developer);
                LibGit2Sharp.Commit commit = repo.Commit(message, signature, signature);
                commitCreated = true;
                createdCommitSha = commit.Sha;
            }

            // A share that failed after committing, or an org library update that failed to push, leaves commits
            // that only a push publishes.
            if (commitCreated || HasCommitsNotOnOrigin(repo, branchName))
            {
                PushBranch(repo, authenticatedContext, branchName);
                pushedBranchName = branchName;
            }
        }
        finally
        {
            activity?.SetTag(ServiceTelemetry.Attributes.Git.CommitIsDirty, isDirty);
            activity?.SetTag(ServiceTelemetry.Attributes.Git.CommitCreated, commitCreated);
            activity?.SetTag(
                ServiceTelemetry.Attributes.Git.CommitPushTarget,
                pushedBranchName.Length == 0 ? "none"
                    : pushedBranchName == DefaultBranch ? "default"
                    : "feature"
            );
            if (createdCommitSha.Length > 0)
            {
                activity?.SetTag(ServiceTelemetry.Attributes.Git.CommitSha, createdCommitSha);
            }
        }
    }

    /// <inheritdoc/>
    public void PublishBranch(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName)
    {
        using var activity = StartActivity(authenticatedContext);
        activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, branchName);
        ExecuteWithTelemetry(
            activity,
            (authenticatedContext, branchName),
            static (self, ctx) =>
            {
                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.authenticatedContext);
                self.PushBranch(repo, ctx.authenticatedContext, ctx.branchName);
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
                ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.IsDirty, status.IsDirty);
                if (status.IsDirty)
                {
                    string commitMessage = ctx.message ?? string.Empty;
                    LibGit2Sharp.Signature signature = self.GetDeveloperSignature(developer);

                    CommandsExtensions.StageAllChanges(repo);
                    repo.Commit(commitMessage, signature, signature);
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
                    Infrastructure.GitRepository.LibGit2Configuration.AssertSymbolicLinksDisabled(repo.Config);
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
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.RebaseStatus, rebaseStatus.ToString());
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.RebaseConflictsAborted, conflictsAborted);
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.RebaseStopAborted, stopAborted);
                }
            }
        );
    }

    /// <inheritdoc/>
    public CombineResult CombineWithRemoteBranch(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName
    )
    {
        using var activity = StartActivity(authenticatedContext);
        activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, branchName);
        return ExecuteWithTelemetry(
            activity,
            (activity, authenticatedContext, branchName),
            static (self, ctx) =>
            {
                self.FetchRemoteChanges(ctx.authenticatedContext);
                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.authenticatedContext);
                CombineResult result = new();
                string combineStatus = "failed";

                Branch upstream =
                    repo.Branches[$"refs/remotes/origin/{ctx.branchName}"]
                    ?? throw new BranchNotFoundException($"Remote branch 'origin/{ctx.branchName}' not found locally.");
                LibGit2Sharp.Commit originalTip = repo.Head.Tip;

                try
                {
                    if (repo.Head.FriendlyName != ctx.branchName)
                    {
                        throw new InvalidOperationException($"Branch '{ctx.branchName}' is not checked out.");
                    }

                    Infrastructure.GitRepository.LibGit2Configuration.AssertSymbolicLinksDisabled(repo.Config);
                    LibGit2Sharp.Signature signature = self.GetDeveloperSignature(ctx.authenticatedContext.Developer);
                    LibGit2Sharp.Commit[] localCommits = GetLocalCommits(repo, upstream);
                    // Commits fetched from Gitea become local when someone rewrites the branch there. A message in
                    // another encoding than UTF-8 would be garbled in a combined commit, so such commits are merged.
                    bool combine = localCommits.All(commit => IsUtf8(commit.Encoding));
                    // LibGit2Sharp's merge updates the files, with the checks that keep uncommitted and untracked
                    // files. Studio changes only the history afterwards.
                    MergeResult mergeResult = repo.Merge(
                        upstream.Tip,
                        signature,
                        new MergeOptions
                        {
                            FastForwardStrategy = FastForwardStrategy.NoFastForward,
                            CommitOnSuccess = !combine,
                        }
                    );
                    if (mergeResult.Status == MergeStatus.Conflicts)
                    {
                        // The conflicts stay in the working directory for the conflict screen.
                        result.HasConflicts = true;
                        combineStatus = "conflicts";
                        SetErrorStatus(ctx.activity, "combine_conflicts");
                        return result;
                    }

                    if (mergeResult.Status == MergeStatus.UpToDate)
                    {
                        combineStatus = "up_to_date";
                        return result;
                    }

                    if (combine)
                    {
                        CommitMergeOnTopOf(repo, originalTip, upstream.Tip, localCommits, signature);
                    }

                    combineStatus = combine ? "combined" : "merged";
                    PopulateContentStatusFromCommitDiff(
                        repo,
                        originalTip.Tree,
                        repo.Head.Tip.Tree,
                        result.ContentStatus
                    );
                    return result;
                }
                finally
                {
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.CombineStatus, combineStatus);
                    ctx.activity?.SetTag(
                        ServiceTelemetry.Attributes.Git.ContentStatusCount,
                        result.ContentStatus.Count
                    );
                }
            }
        );
    }

    /// <inheritdoc/>
    public void CreateLocalBranch(AltinnRepoEditingContext editingContext, string branchName, string commitSha = null!)
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, branchName);
        activity?.SetTag(ServiceTelemetry.Attributes.Git.CommitSha, commitSha);
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
        activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, branchName);
        ExecuteWithTelemetry(
            activity,
            (activity, authenticatedContext, branchName),
            static (self, ctx) =>
            {
                self.FetchRemoteChanges(ctx.authenticatedContext);

                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.authenticatedContext);
                if (RemoteBranchExists(ctx.branchName, repo) is false)
                {
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.BranchDeleted, false);
                    return;
                }

                Remote remote = repo.Network.Remotes["origin"];
                PushOptions options = new()
                {
                    CredentialsProvider = self.GetCredentialsHandler(ctx.authenticatedContext),
                    CustomHeaders = self.GetAuthCustomHeaders(ctx.authenticatedContext),
                };
                string pushRefSpec = $":refs/heads/{ctx.branchName}";
                repo.Network.Push(remote, pushRefSpec, options);
                ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.BranchDeleted, true);
            }
        );
    }

    /// <inheritdoc/>
    public void DeleteLocalBranchIfExists(AltinnRepoEditingContext editingContext, string branchName)
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, branchName);
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
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.BranchDeleted, true);
                    return;
                }

                ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.BranchDeleted, false);
            }
        );
    }

    /// <inheritdoc/>
    public void CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName)
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, branchName);
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

                Infrastructure.GitRepository.LibGit2Configuration.AssertSymbolicLinksDisabled(repo.Config);
                Commands.Checkout(repo, branch);
            }
        );
    }

    /// <inheritdoc/>
    public void MergeBranchIntoHead(AltinnRepoEditingContext editingContext, string featureBranch)
    {
        using var activity = StartActivity(editingContext);
        activity?.SetTag(ServiceTelemetry.Attributes.Git.FeatureBranch, featureBranch);
        ExecuteWithTelemetry(
            activity,
            (editingContext, featureBranch),
            static (self, ctx) =>
            {
                string localPath = self.FindLocalRepoLocation(ctx.editingContext);
                using LibGit2Sharp.Repository repo = new(localPath);

                Branch branch = repo.Branches.Single(branch => branch.FriendlyName == ctx.featureBranch);
                LibGit2Sharp.Signature signature = self.GetDeveloperSignature(ctx.editingContext.Developer);
                Infrastructure.GitRepository.LibGit2Configuration.AssertSymbolicLinksDisabled(repo.Config);
                MergeResult result = repo.Merge(branch, signature);
                if (result.Status == MergeStatus.Conflicts)
                {
                    Infrastructure.GitRepository.LibGit2Configuration.AssertSymbolicLinksDisabled(repo.Config);
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
    public Dictionary<string, FolderHistory> GetTopLevelFolderHistory(AltinnRepoEditingContext editingContext)
    {
        using var activity = StartActivity(editingContext);
        return ExecuteWithTelemetry(
            activity,
            editingContext,
            static (self, editingContext) =>
                ReadTopLevelFolderHistory(
                    self._repositorySettings.GetServicePath(
                        editingContext.Org,
                        editingContext.Repo,
                        editingContext.Developer
                    )
                )
        );
    }

    private static Dictionary<string, FolderHistory> ReadTopLevelFolderHistory(string localPath)
    {
        if (!LibGit2Sharp.Repository.IsValid(localPath))
        {
            return [];
        }

        using LibGit2Sharp.Repository repo = new(localPath);
        LibGit2Sharp.Commit? remoteDefaultBranchTip = repo.Branches[$"origin/{General.DefaultBranch}"]?.Tip;
        if (remoteDefaultBranchTip is null)
        {
            return [];
        }

        // Children before parents, so each commit is handled after every child that leads to it.
        List<LibGit2Sharp.Commit> commits = repo
            .Commits.QueryBy(
                new CommitFilter
                {
                    IncludeReachableFrom = remoteDefaultBranchTip,
                    SortBy = CommitSortStrategies.Topological | CommitSortStrategies.Time,
                }
            )
            .ToList();
        Dictionary<ObjectId, HashSet<string>[]> changedFoldersByCommit = commits.ToDictionary(
            commit => commit.Id,
            commit => GetTopLevelFoldersChangedFromEachParent(repo, commit)
        );

        // Follows the history of each folder like `git log -- <folder>` does by default: a merge that left the
        // folder identical to one of its parents is skipped, and only that parent's history is followed.
        Dictionary<ObjectId, HashSet<string>> foldersToFollow = new()
        {
            [remoteDefaultBranchTip.Id] = changedFoldersByCommit
                .Values.SelectMany(changed => changed)
                .SelectMany(folders => folders)
                .ToHashSet(),
        };
        Dictionary<string, FolderHistory> history = [];
        Dictionary<string, DateTimeOffset> firstCommitTimes = [];
        foreach (LibGit2Sharp.Commit commit in commits)
        {
            if (!foldersToFollow.Remove(commit.Id, out HashSet<string>? folders))
            {
                continue;
            }

            LibGit2Sharp.Commit[] parents = commit.Parents.ToArray();
            HashSet<string>[] changedFromParents = changedFoldersByCommit[commit.Id];
            foreach (string folder in folders)
            {
                int unchangedParentIndex = Array.FindIndex(changedFromParents, changed => !changed.Contains(folder));
                if (parents.Length > 1 && unchangedParentIndex >= 0)
                {
                    FollowFolder(foldersToFollow, parents[unchangedParentIndex], folder);
                    continue;
                }

                if (unchangedParentIndex < 0)
                {
                    RecordFolderCommit(history, firstCommitTimes, folder, commit);
                }

                foreach (LibGit2Sharp.Commit parent in parents)
                {
                    FollowFolder(foldersToFollow, parent, folder);
                }
            }
        }

        return history;
    }

    private static void FollowFolder(
        Dictionary<ObjectId, HashSet<string>> foldersToFollow,
        LibGit2Sharp.Commit commit,
        string folder
    )
    {
        if (!foldersToFollow.TryGetValue(commit.Id, out HashSet<string>? folders))
        {
            folders = [];
            foldersToFollow[commit.Id] = folders;
        }

        folders.Add(folder);
    }

    private static void RecordFolderCommit(
        Dictionary<string, FolderHistory> history,
        Dictionary<string, DateTimeOffset> firstCommitTimes,
        string folder,
        LibGit2Sharp.Commit commit
    )
    {
        DateTimeOffset commitTime = commit.Committer.When;
        if (!history.TryGetValue(folder, out FolderHistory? folderHistory))
        {
            history[folder] = new FolderHistory(commit.Author.Name, commitTime);
            firstCommitTimes[folder] = commitTime;
            return;
        }

        if (commitTime > folderHistory.LastCommitTime)
        {
            folderHistory = folderHistory with { LastCommitTime = commitTime };
        }

        if (commitTime < firstCommitTimes[folder])
        {
            folderHistory = folderHistory with { FirstCommitAuthorName = commit.Author.Name };
            firstCommitTimes[folder] = commitTime;
        }

        history[folder] = folderHistory;
    }

    /// <returns>The top-level folders changed from each parent, in parent order; for a root commit, the folders
    /// changed from the empty tree.</returns>
    private static HashSet<string>[] GetTopLevelFoldersChangedFromEachParent(
        LibGit2Sharp.Repository repo,
        LibGit2Sharp.Commit commit
    )
    {
        Tree?[] parentTrees = commit.Parents.Any() ? [.. commit.Parents.Select(parent => parent.Tree)] : [null];
        return parentTrees
            .Select(parentTree =>
            {
                using TreeChanges changes = repo.Diff.Compare<TreeChanges>(parentTree, commit.Tree);
                return changes
                    .SelectMany(change => new[] { change.Path, change.OldPath })
                    .Select(path => path.Split('/', 2))
                    .Where(pathSegments => pathSegments.Length == 2)
                    .Select(pathSegments => pathSegments[0])
                    .ToHashSet();
            })
            .ToArray();
    }

    /// <inheritdoc/>
    public RepoStatus CheckoutBranchWithValidation(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName
    )
    {
        using var activity = StartActivity(authenticatedContext);
        activity?.SetTag(ServiceTelemetry.Attributes.Git.TargetBranch, branchName);
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

                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.CheckoutBlocked, true);
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
                    Infrastructure.GitRepository.LibGit2Configuration.AssertSymbolicLinksDisabled(repo.Config);
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
    /// <param name="org">Unique identifier of the organization responsible for the app.</param>
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
        activity?.SetTag(ServiceTelemetry.Attributes.Git.FilePath, fileName);
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
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.FileStaged, false);
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
                    ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.FileStaged, true);
                    return;
                }

                ctx.activity?.SetTag(ServiceTelemetry.Attributes.Git.FileStaged, false);
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
        activity?.SetTag(ServiceTelemetry.Attributes.Git.Branch, branchName);
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
        activity?.SetTag(ServiceTelemetry.Attributes.Git.TargetBranch, target);
        activity?.SetTag(ServiceTelemetry.Attributes.Git.SourceBranch, source);

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
        return new LibGit2Sharp.Signature(GetDefaultIdentity(developer), DateTime.Now);
    }

    private static Identity GetDefaultIdentity(string developer)
    {
        return new Identity(developer, $"{developer}@{General.StudioCommitEmailDomain}");
    }

    private LibGit2Sharp.Repository CreateLocalRepo(AltinnRepoEditingContext editingContext)
    {
        string localPath = FindLocalRepoLocation(editingContext);
        return new LibGit2Sharp.Repository(localPath);
    }

    private LibGit2Sharp.Handlers.CredentialsHandler? GetCredentialsHandler(
        AltinnAuthenticatedRepoEditingContext authenticatedContext
    )
    {
        if (!authenticatedContext.MustUseTokenAuth)
        {
            return null;
        }

        return (url, user, cred) =>
            new UsernamePasswordCredentials
            {
                Username = authenticatedContext.DeveloperAppToken,
                Password = string.Empty,
            };
    }

    private void FetchRemoteChanges(
        LibGit2Sharp.Repository repo,
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string logMessage = ""
    )
    {
        FetchOptions fetchOptions = new()
        {
            CredentialsProvider = GetCredentialsHandler(authenticatedContext),
            CustomHeaders = GetAuthCustomHeaders(authenticatedContext),
        };

        foreach (Remote remote in repo.Network.Remotes)
        {
            IEnumerable<string> refSpecs = remote.FetchRefSpecs.Select(x => x.Specification);
            try
            {
                Commands.Fetch(repo, remote.Name, refSpecs, fetchOptions, logMessage);
            }
            catch (LibGit2SharpException ex)
                when (ex.Message.Contains($"refs/remotes/{remote.Name}/", StringComparison.Ordinal)
                    && !RemoteTrackingRefsAreLocked(repo, remote.Name)
                )
            {
                // When a remote branch is replaced by one nested under or above it, such as develop by develop/test,
                // the stale tracking ref is in the way. Git's fetch --prune removes stale refs before it writes new
                // ones, but libgit2 prunes afterwards. Tracking refs only mirror the remote, so fetch writes them again.
                RemoveRemoteTrackingRefs(repo, remote.Name);
                Activity.Current?.SetTag(ServiceTelemetry.Attributes.Git.FetchTrackingRefsRebuilt, true);
                Commands.Fetch(repo, remote.Name, refSpecs, fetchOptions, logMessage);
            }
        }
    }

    private static bool RemoteTrackingRefsAreLocked(LibGit2Sharp.Repository repo, string remoteName)
    {
        // A writer holds the refs, or one crashed while holding them. Removing them would stop half way.
        string trackingRefsDirectory = Path.Join(repo.Info.Path, "refs", "remotes", remoteName);
        return File.Exists(Path.Join(repo.Info.Path, "packed-refs.lock"))
            || (
                Directory.Exists(trackingRefsDirectory)
                && Directory.EnumerateFiles(trackingRefsDirectory, "*.lock", SearchOption.AllDirectories).Any()
            );
    }

    private static void RemoveRemoteTrackingRefs(LibGit2Sharp.Repository repo, string remoteName)
    {
        // Keeps symbolic refs such as origin/HEAD, which fetch doesn't write.
        List<DirectReference> trackingRefs = repo
            .Refs.FromGlob($"refs/remotes/{remoteName}/*")
            .OfType<DirectReference>()
            .ToList();
        foreach (DirectReference trackingRef in trackingRefs)
        {
            repo.Refs.Remove(trackingRef);
        }
    }

    private void PushBranch(
        LibGit2Sharp.Repository repo,
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName
    )
    {
        string remoteUrl = FindRemoteRepoLocation(authenticatedContext.Org, authenticatedContext.Repo);
        Remote remote = repo.Network.Remotes["origin"];
        if (!remote.PushUrl.Equals(remoteUrl))
        {
            // This is relevant when we switch between running designer in local or in docker. The remote URL changes.
            // Requires administrator access to update files.
            repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
        }

        Branch branch =
            repo.Branches[branchName]
            ?? throw new BranchNotFoundException(
                $"Branch '{branchName}' not found in local repository. Cannot push non-existing branch."
            );
        branch = EnsureLocalBranchTracksOrigin(repo, branch);
        PushOptions options = new()
        {
            CredentialsProvider = GetCredentialsHandler(authenticatedContext),
            CustomHeaders = GetAuthCustomHeaders(authenticatedContext),
        };
        repo.Network.Push(branch, options);
    }

    private static bool HasCommitsNotOnOrigin(LibGit2Sharp.Repository repo, string branchName)
    {
        LibGit2Sharp.Commit? tip = repo.Branches[branchName]?.Tip;
        if (tip is null)
        {
            return false;
        }

        LibGit2Sharp.Commit? remoteTip = repo.Branches[$"refs/remotes/origin/{branchName}"]?.Tip;
        return remoteTip is null || repo.ObjectDatabase.CalculateHistoryDivergence(tip, remoteTip).AheadBy > 0;
    }

    private static void EnsureUnbornHeadPointsToBranch(LibGit2Sharp.Repository repo, string branchName)
    {
        if (repo.Head.Tip is not null || repo.Head.FriendlyName == branchName)
        {
            return;
        }

        repo.Refs.UpdateTarget("HEAD", $"refs/heads/{branchName}");
    }

    private static Branch EnsureLocalBranchTracksOrigin(LibGit2Sharp.Repository repo, Branch branch)
    {
        return repo.Branches.Update(
            branch,
            updater =>
            {
                updater.Remote = "origin";
                updater.UpstreamBranch = $"refs/heads/{branch.FriendlyName}";
            }
        );
    }

    private static void PopulateContentStatusFromCommitDiff(
        LibGit2Sharp.Repository repo,
        Tree oldTree,
        Tree? newTree,
        ICollection<RepositoryContent> contentStatus
    )
    {
        if (newTree is null)
        {
            return;
        }

        using TreeChanges treeChanges = repo.Diff.Compare<TreeChanges>(oldTree, newTree);
        AddTreeChangesToContentStatus(contentStatus, treeChanges);
    }

    private static void AddTreeChangesToContentStatus(
        ICollection<RepositoryContent> contentStatus,
        TreeChanges treeChanges
    )
    {
        foreach (TreeEntryChanges change in treeChanges.Added)
        {
            contentStatus.Add(
                new RepositoryContent { FilePath = change.Path, FileStatus = Enums.FileStatus.NewInWorkdir }
            );
        }

        foreach (TreeEntryChanges change in treeChanges.Modified)
        {
            contentStatus.Add(
                new RepositoryContent { FilePath = change.Path, FileStatus = Enums.FileStatus.ModifiedInWorkdir }
            );
        }

        foreach (TreeEntryChanges change in treeChanges.Deleted)
        {
            contentStatus.Add(
                new RepositoryContent { FilePath = change.Path, FileStatus = Enums.FileStatus.DeletedFromWorkdir }
            );
        }

        foreach (TreeEntryChanges change in treeChanges.Renamed)
        {
            contentStatus.Add(
                new RepositoryContent { FilePath = change.Path, FileStatus = Enums.FileStatus.RenamedInWorkdir }
            );
        }
    }

    private static LibGit2Sharp.Commit[] GetLocalCommits(LibGit2Sharp.Repository repo, Branch upstream) =>
        repo
            .Commits.QueryBy(
                new CommitFilter
                {
                    IncludeReachableFrom = repo.Head,
                    ExcludeReachableFrom = upstream,
                    SortBy = CommitSortStrategies.Topological | CommitSortStrategies.Reverse,
                }
            )
            .ToArray();

    // Replaces the merge that is in progress with one commit on top of the remote branch, so that the history stays
    // linear and the files are exactly what the merge gave. A share has one local commit. Several are left only by
    // shares that failed, and they become one. The index already holds the merged files, so only the merge state and
    // the branch change. Ending the merge first means that a failure leaves either the merge, which the next share
    // commits, or the merged files as uncommitted changes, which the next share combines again.
    private static void CommitMergeOnTopOf(
        LibGit2Sharp.Repository repo,
        LibGit2Sharp.Commit originalTip,
        LibGit2Sharp.Commit onto,
        LibGit2Sharp.Commit[] localCommits,
        LibGit2Sharp.Signature committer
    )
    {
        Tree mergedTree = repo.ObjectDatabase.CreateTree(repo.Index);
        LibGit2Sharp.Commit target =
            localCommits.Length == 0 || mergedTree.Id == onto.Tree.Id
                ? onto
                : repo.ObjectDatabase.CreateCommit(
                    localCommits[^1].Author,
                    committer,
                    string.Join("\n\n", localCommits.Select(commit => commit.Message.TrimEnd())) + "\n",
                    mergedTree,
                    [onto],
                    prettifyMessage: false
                );
        string branchReference = repo.Head.CanonicalName;
        // LibGit2Sharp cannot end a merge without resetting the index, which would drop files staged meanwhile.
        // MERGE_HEAD goes last, because it is what marks the merge.
        foreach (string mergeFile in new[] { "MERGE_MSG", "MERGE_MODE", "MERGE_HEAD" })
        {
            File.Delete(Path.Join(repo.Info.Path, mergeFile));
        }

        // Requests outside the repository lock can commit meanwhile. Keeping their commit loses nothing, and the request's
        // own push usually publishes it. LibGit2Sharp cannot make the check and the move one step, so a commit in
        // between the two is still replaced, but its files stay staged for the next share.
        LibGit2Sharp.Reference branch = repo.Refs[branchReference];
        if (branch.TargetIdentifier != originalTip.Sha)
        {
            throw new InvalidOperationException($"'{branchReference}' changed while Studio combined it.");
        }

        repo.Refs.UpdateTarget(branch, target.Id, "studio: combine local commits");
    }

    private static bool IsUtf8(string? encoding) =>
        encoding is null || string.Equals(encoding, "UTF-8", StringComparison.OrdinalIgnoreCase);

    private string[] GetAuthCustomHeaders(AltinnAuthenticatedRepoEditingContext? authenticatedContext = null)
    {
        if (authenticatedContext?.MustUseTokenAuth == true)
        {
            return [];
        }

        return authHeadersProvider.GetAuthHeaders().Select(h => $"{h.Key}: {h.Value}").ToArray();
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
        SetCommonTags(activity, editingContext.Org, editingContext.Repo);
        return activity;
    }

    private static Activity? StartActivity(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        [CallerMemberName] string methodName = ""
    )
    {
        var activity = StartActivityCore(methodName);
        SetCommonTags(activity, authenticatedContext.Org, authenticatedContext.Repo);
        return activity;
    }

    // The service owner, app and user are on the root span. Only the repository can differ from the request's.
    private static void SetCommonTags(Activity? activity, string owner, string repository) =>
        activity?.SetTag(ServiceTelemetry.Attributes.Git.Repository, $"{owner}/{repository}");

    private static void SetErrorStatus(Activity? activity, string description) =>
        activity?.SetStatus(ActivityStatusCode.Error, description);

    private static void RecordException(Activity? activity, Exception exception)
    {
        activity?.AddException(exception);
        SetErrorStatus(activity, exception.GetType().Name);
    }

    private static void SetRepositoryStatusTag(Activity? activity, Enums.RepositoryStatus repositoryStatus) =>
        activity?.SetTag(ServiceTelemetry.Attributes.Git.RepositoryStatus, repositoryStatus.ToString());

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

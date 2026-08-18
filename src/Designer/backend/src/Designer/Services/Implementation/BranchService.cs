using System;
using System.Diagnostics;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Telemetry;
using LibGit2Sharp;

namespace Altinn.Studio.Designer.Services.Implementation;

public class BranchService(
    ISourceControl sourceControl,
    IGiteaClient giteaClient,
    ServiceRepositorySettings repositorySettings,
    IGitServerAuthHeadersProvider authHeadersProvider
) : IBranchService
{
    private const string DefaultBranch = General.DefaultBranch;

    private readonly ISourceControl _sourceControl = sourceControl;
    private readonly IGiteaClient _giteaClient = giteaClient;
    private readonly ServiceRepositorySettings _repositorySettings = repositorySettings;

    public DeleteBranchResult DeleteBranch(
        AltinnAuthenticatedRepoEditingContext authenticatedContext,
        string branchName
    )
    {
        if (string.IsNullOrWhiteSpace(branchName))
        {
            return DeleteBranchResult.InvalidBranchName;
        }

        try
        {
            Guard.AssertValidRepoBranchName(branchName);
        }
        catch (ArgumentException)
        {
            return DeleteBranchResult.InvalidBranchName;
        }

        if (branchName == General.DefaultBranch)
        {
            return DeleteBranchResult.DefaultBranchProtected;
        }

        AltinnRepoEditingContext editingContext = authenticatedContext.RepoEditingContext;
        CurrentBranchInfo currentBranch = GetCurrentBranch(editingContext);
        if (currentBranch.BranchName == branchName)
        {
            return DeleteBranchResult.CheckedOutBranchProtected;
        }

        DeleteRemoteBranchIfExists(authenticatedContext, branchName);
        DeleteLocalBranchIfExists(editingContext, branchName);

        return DeleteBranchResult.Success;
    }

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
                RepoStatus repoStatus = self._sourceControl.RepositoryStatus(ctx.authenticatedContext);
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

                self._sourceControl.FetchRemoteChanges(ctx.authenticatedContext);
                self.CheckoutRepoOnBranch(editingContext, ctx.branchName);
                RepoStatus updatedRepoStatus = self._sourceControl.RepositoryStatus(editingContext);
                SetRepositoryStatusTag(ctx.activity, updatedRepoStatus.RepositoryStatus);
                return updatedRepoStatus;
            }
        );
    }

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

                RepoStatus repoStatus = self._sourceControl.RepositoryStatus(ctx.editingContext);
                SetRepositoryStatusTag(ctx.activity, repoStatus.RepositoryStatus);
                return repoStatus;
            }
        );
    }

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
                self._sourceControl.FetchRemoteChanges(ctx.authenticatedContext);

                using LibGit2Sharp.Repository repo = self.CreateLocalRepo(ctx.authenticatedContext);
                if (RemoteBranchExists(ctx.branchName, repo) is false)
                {
                    ctx.activity?.SetTag("branch.deleted", false);
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
                ctx.activity?.SetTag("branch.deleted", true);
            }
        );
    }

    private LibGit2Sharp.Repository CreateLocalRepo(AltinnRepoEditingContext editingContext)
    {
        string localPath = _sourceControl.FindLocalRepoLocation(editingContext);
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

    private string[] GetAuthCustomHeaders(AltinnAuthenticatedRepoEditingContext? authenticatedContext = null)
    {
        if (authenticatedContext?.MustUseTokenAuth == true)
        {
            return [];
        }

        return authHeadersProvider.GetAuthHeaders().Select(h => $"{h.Key}: {h.Value}").ToArray();
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

    private static Activity? StartActivityCore(string methodName) =>
        ServiceTelemetry.Source.StartActivity($"{nameof(BranchService)}.{methodName}");

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

    private TReturn ExecuteWithTelemetry<TContext, TReturn>(
        Activity? activity,
        TContext context,
        Func<BranchService, TContext, TReturn> action
    )
    {
        try
        {
            return action(this, context);
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
        Action<BranchService, TContext> action
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
        Func<BranchService, TContext, Task<TReturn>> action
    )
    {
        try
        {
            return await action(this, context);
        }
        catch (Exception ex)
        {
            RecordException(activity, ex);
            throw;
        }
    }
}

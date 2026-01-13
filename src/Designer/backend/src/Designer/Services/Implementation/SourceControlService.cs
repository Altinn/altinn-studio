#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Exceptions.SourceControl;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using LibGit2Sharp;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the source control service.
    /// </summary>
    /// <remarks>
    /// Initializes a new instance of the <see cref="SourceControlService"/> class.
    /// </remarks>
    /// <param name="repositorySettings">The settings for the service repository.</param>
    /// <param name="httpContextAccessor">the http context accessor.</param>
    /// <param name="giteaClient">The gitea client.</param>
    /// <param name="logger">the log handler.</param>
    public class SourceControlService(
        ServiceRepositorySettings repositorySettings,
        IHttpContextAccessor httpContextAccessor,
        IGiteaClient giteaClient,
        ILogger<SourceControlService> logger) : ISourceControl
    {
        private const string DefaultBranch = General.DefaultBranch;

        /// <summary>
        /// Clone remote repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The result of the cloning</returns>
        public async Task<string> CloneRemoteRepository(string org, string repository)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string remoteRepo = FindRemoteRepoLocation(org, repository);
            CloneOptions cloneOptions = new();
            cloneOptions.FetchOptions.CredentialsProvider = await GetCredentialsAsync();
            string localPath = FindLocalRepoLocation(org, repository, developer);
            string cloneResult = LibGit2Sharp.Repository.Clone(remoteRepo, localPath, cloneOptions);

            await FetchGitNotes(localPath);
            return cloneResult;
        }

        /// <inheritdoc />
        public async Task<string> CloneRemoteRepository(string org, string repository, string destinationPath, string branchName = "")
        {
            string remoteRepo = FindRemoteRepoLocation(org, repository);
            CloneOptions cloneOptions = new();
            cloneOptions.FetchOptions.CredentialsProvider = await GetCredentialsAsync();

            if (!string.IsNullOrEmpty(branchName))
            {
                cloneOptions.BranchName = branchName;
            }

            string cloneResult = LibGit2Sharp.Repository.Clone(remoteRepo, destinationPath, cloneOptions);
            await FetchGitNotes(destinationPath);
            return cloneResult;
        }

        /// <inheritdoc />
        public async Task<RepoStatus> PullRemoteChanges(string org, string repository)
        {
            RepoStatus status = new()
            {
                ContentStatus = []
            };
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            using (var repo = new LibGit2Sharp.Repository(FindLocalRepoLocation(org, repository, developer)))
            {
                PullOptions pullOptions = new()
                {
                    MergeOptions = new MergeOptions()
                    {
                        FastForwardStrategy = FastForwardStrategy.Default,
                    },
                    FetchOptions = new FetchOptions()
                };
                pullOptions.FetchOptions.CredentialsProvider = await GetCredentialsAsync();

                try
                {
                    Tree head = repo.Head.Tip.Tree;
                    MergeResult mergeResult = Commands.Pull(
                        repo,
                        GetDeveloperSignature(),
                        pullOptions);

                    await FetchGitNotes(FindLocalRepoLocation(org, repository, developer));
                    TreeChanges treeChanges = repo.Diff.Compare<TreeChanges>(head, mergeResult.Commit?.Tree);
                    foreach (TreeEntryChanges change in treeChanges.Modified)
                    {
                        status.ContentStatus.Add(new RepositoryContent { FilePath = change.Path, FileStatus = Enums.FileStatus.ModifiedInWorkdir });
                    }

                    if (mergeResult.Status == MergeStatus.Conflicts)
                    {
                        status.RepositoryStatus = Enums.RepositoryStatus.MergeConflict;
                    }
                }
                catch (CheckoutConflictException e)
                {
                    logger.LogError($"{nameof(SourceControlService)} // PullRemoteChanges // CheckoutConflictException occured when pulling repo {FindLocalRepoLocation(org, repository, developer)}. {e}");
                    status.RepositoryStatus = Enums.RepositoryStatus.CheckoutConflict;
                }
                catch (Exception e)
                {
                    logger.LogError($"{nameof(SourceControlService)} // PullRemoteChanges // Exception occured when pulling repo {FindLocalRepoLocation(org, repository, developer)}. {e}");
                    throw;
                }
            }

            return status;
        }

        /// <summary>
        /// Fetches the remote changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository.</param>
        public async Task FetchRemoteChanges(string org, string repository)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string logMessage = string.Empty;
            using (var repo = new LibGit2Sharp.Repository(FindLocalRepoLocation(org, repository, developer)))
            {
                FetchOptions fetchOptions = new()
                {
                    CredentialsProvider = await GetCredentialsAsync()
                };

                foreach (Remote remote in repo?.Network?.Remotes)
                {
                    IEnumerable<string> refSpecs = remote.FetchRefSpecs.Select(x => x.Specification);
                    Commands.Fetch(repo, remote.Name, refSpecs, fetchOptions, logMessage);
                }
            }
        }

        /// <inheritdoc/>
        public async Task CommitAndPushChanges(string org, string repository, string branchName, string localPath, string message, string accessToken = "")
        {
            await CommitAndPushToBranch(org, repository, branchName, localPath, message, accessToken);
        }

        /// <inheritdoc/>
        public async Task PushChangesForRepository(CommitInfo commitInfo, string developer)
        {
            string localServiceRepoFolder = repositorySettings.GetServicePath(commitInfo.Org, commitInfo.Repository, developer);

            string branchName = commitInfo.BranchName;
            if (string.IsNullOrEmpty(branchName))
            {
                using LibGit2Sharp.Repository repo = new(localServiceRepoFolder);
                branchName = repo.Head.FriendlyName;
            }

            await CommitAndPushToBranch(commitInfo.Org, commitInfo.Repository, branchName, localServiceRepoFolder, commitInfo.Message);
        }

        /// <inheritdoc/>
        public async Task<bool> Push(string org, string repository, string developer)
        {
            bool pushSuccess = true;
            string localServiceRepoFolder = repositorySettings.GetServicePath(org, repository, developer);
            using LibGit2Sharp.Repository repo = new(localServiceRepoFolder);
            string remoteUrl = FindRemoteRepoLocation(org, repository);
            Remote remote = repo.Network.Remotes["origin"];

            if (!remote.PushUrl.Equals(remoteUrl))
            {
                // This is relevant when we switch beteen running designer in local or in docker. The remote URL changes.
                // Requires adminstrator access to update files.
                repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
            }

            PushOptions options = new()
            {
                OnPushStatusError = pushError =>
                {
                    logger.LogError("Push error: {0}", pushError.Message);
                    pushSuccess = false;
                },
                CredentialsProvider = await GetCredentialsAsync()
            };

            repo.Network.Push(remote, $"refs/heads/{DefaultBranch}", options);
            repo.Network.Push(remote, "refs/notes/commits", options);

            return pushSuccess;
        }

        /// <inheritdoc/>
        public void Commit(CommitInfo commitInfo, string developer)
        {
            CommitAndAddStudioNote(commitInfo.Org, commitInfo.Repository, developer, commitInfo.Message);
        }

        private void CommitAndAddStudioNote(string org, string repository, string developer, string message)
        {
            string localServiceRepoFolder = repositorySettings.GetServicePath(org, repository, developer);
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

            LibGit2Sharp.Signature signature = GetDeveloperSignature();
            LibGit2Sharp.Commit commit = repo.Commit(message, signature, signature);

            NoteCollection notes = repo.Notes;
            notes.Add(commit.Id, "studio-commit", signature, signature, notes.DefaultNamespace);

        }

        /// <inheritdoc/>
        public List<RepositoryContent> Status(string org, string repository, string developer)
        {
            List<RepositoryContent> repoContent = [];
            string localServiceRepoFolder = repositorySettings.GetServicePath(org, repository, developer);
            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                RepositoryStatus status = repo.RetrieveStatus(new StatusOptions());
                foreach (StatusEntry item in status)
                {
                    RepositoryContent content = new()
                    {
                        FilePath = item.FilePath,
                        FileStatus = (Enums.FileStatus)item.State
                    };
                    repoContent.Add(content);
                }
            }

            return repoContent;
        }

        /// <inheritdoc/>
        public RepoStatus RepositoryStatus(string org, string repository, string developer)
        {
            RepoStatus repoStatus = new()
            {
                ContentStatus = []
            };
            string localServiceRepoFolder = repositorySettings.GetServicePath(org, repository, developer);
            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
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

                Branch branch = repo.Branches.FirstOrDefault(b => b.IsTracking);
                if (branch != null)
                {
                    repoStatus.AheadBy = branch.TrackingDetails.AheadBy;
                    repoStatus.BehindBy = branch.TrackingDetails.BehindBy;
                }

                repoStatus.CurrentBranch = repo.Head.FriendlyName;
            }

            return repoStatus;
        }

        /// <inheritdoc/>
        public async Task<Dictionary<string, string>> GetChangedContent(string org, string repository, string developer)
        {
            string localServiceRepoFolder = repositorySettings.GetServicePath(org, repository, developer);
            Dictionary<string, string> fileDiffs = [];
            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                await FetchRemoteChanges(org, repository);
                Branch remoteMainBranch = repo.Branches[$"refs/remotes/origin/{DefaultBranch}"];
                if (remoteMainBranch == null || remoteMainBranch.Tip == null)
                {
                    return fileDiffs;
                }
                LibGit2Sharp.Commit remoteMainCommit = remoteMainBranch.Tip;

                TreeChanges changes = repo.Diff.Compare<TreeChanges>(remoteMainCommit.Tree, DiffTargets.WorkingDirectory);
                foreach (TreeEntryChanges change in changes)
                {
                    Patch patch = repo.Diff.Compare<Patch>(remoteMainCommit.Tree, DiffTargets.WorkingDirectory, [change.Path]);
                    fileDiffs[change.Path] = patch.Content;
                }

                return fileDiffs;
            }
        }

        /// <inheritdoc/>
        public Designer.Models.Commit GetLatestCommitForCurrentUser(string org, string repository, string developer)
        {
            List<Designer.Models.Commit> commits = Log(org, repository, developer);
            Designer.Models.Commit latestCommit = commits.FirstOrDefault(commit => commit.Author.Name == developer);
            return latestCommit;
        }

        /// <inheritdoc/>
        public List<Designer.Models.Commit> Log(string org, string repository, string developer)
        {
            List<Designer.Models.Commit> commits = [];
            string localServiceRepoFolder = repositorySettings.GetServicePath(org, repository, developer);
            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
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
                            When = c.Author.When
                        },

                        Comitter = new Designer.Models.Signature
                        {
                            Name = c.Committer.Name,
                            Email = c.Committer.Email,
                            When = c.Committer.When
                        }
                    };

                    commits.Add(commit);
                }
            }

            return commits;
        }

        /// <inheritdoc/>
        public void StoreAppTokenForUser(string token, string developer)
        {
            CheckAndCreateDeveloperFolder(developer);

            string path = Path.Combine(repositorySettings.RepositoryLocation, developer, "AuthToken.txt");
            File.WriteAllText(path, token);
        }

        /// <summary>
        /// Verifies if there exist a developer folder
        /// </summary>
        private void CheckAndCreateDeveloperFolder(string developer)
        {
            string path = Path.Combine(repositorySettings.RepositoryLocation, developer);

            if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(path);
            }
        }


        public string FindLocalRepoLocation(string org, string repository, string developer)
        {
            return FindLocalRepoLocation(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer));
        }

        private string FindLocalRepoLocation(AltinnRepoEditingContext editingContext)
        {
            return Path.Combine(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") ?? repositorySettings.RepositoryLocation, editingContext.Path);
        }

        /// <inheritdoc />
        public async Task CloneIfNotExists(string org, string repository)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string repoLocation = FindLocalRepoLocation(org, repository, developer);
            if (!Directory.Exists(repoLocation))
            {
                try
                {
                    await CloneRemoteRepository(org, repository);
                }
                catch (Exception e)
                {
                    logger.LogError($"Failed to clone repository {org}/{repository} with exception: {e}");
                }
            }
        }

        private async Task CommitAndPushToBranch(string org, string repository, string branchName, string localPath, string message, string accessToken = "")
        {
            using LibGit2Sharp.Repository repo = new(localPath);
            // Restrict users from empty commit
            if (repo.RetrieveStatus().IsDirty)
            {
                await FetchGitNotes(localPath);
                string remoteUrl = FindRemoteRepoLocation(org, repository);
                Remote remote = repo.Network.Remotes["origin"];

                if (!remote.PushUrl.Equals(remoteUrl))
                {
                    // This is relevant when we switch between running designer in local or in docker. The remote URL changes.
                    // Requires administrator access to update files.
                    repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
                }

                Commands.Stage(repo, "*");

                LibGit2Sharp.Signature signature = GetDeveloperSignature();
                LibGit2Sharp.Commit commit = repo.Commit(message, signature, signature);
                NoteCollection notes = repo.Notes;
                notes.Add(commit.Id, "studio-commit", signature, signature, notes.DefaultNamespace);

                PushOptions options = new()
                {
                    CredentialsProvider = await GetCredentialsAsync(accessToken)
                };

                if (branchName == DefaultBranch)
                {
                    repo.Network.Push(remote, $"refs/heads/{DefaultBranch}", options);
                    repo.Network.Push(remote, "refs/notes/commits", options);

                    return;
                }

                Branch b = repo.Branches[branchName];
                repo.Network.Push(b, options);
                repo.Network.Push(remote, "refs/notes/commits", options);
            }
        }

        /// <inheritdoc/>
        public async Task PublishBranch(AltinnRepoEditingContext editingContext, string branchName)
        {
            using LibGit2Sharp.Repository repo = CreateLocalRepo(editingContext);
            string remoteUrl = FindRemoteRepoLocation(editingContext.Org, editingContext.Repo);
            Remote remote = repo.Network.Remotes["origin"];
            if (!remote.PushUrl.Equals(remoteUrl))
            {
                // This is relevant when we switch between running designer in local or in docker. The remote URL changes.
                // Requires administrator access to update files.
                repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
            }

            Branch branch = repo.Branches[branchName] ?? throw new BranchNotFoundException($"Branch '{branchName}' not found in local repository. Cannot publish non-existing branch.");

            repo.Branches.Update(
                branch,
                updater =>
                {
                    updater.Remote = "origin";
                    updater.UpstreamBranch = $"refs/heads/{branchName}";
                }
            );

            PushOptions options = new()
            {
                CredentialsProvider = await GetCredentialsAsync()
            };
            repo.Network.Push(branch, options);
            repo.Network.Push(remote, "refs/notes/commits", options);
        }

        /// <inheritdoc/>
        public void CommitToLocalRepo(AltinnRepoEditingContext editingContext, string message)
        {
            using LibGit2Sharp.Repository repo = CreateLocalRepo(editingContext);

            if (repo.RetrieveStatus().IsDirty)
            {
                string commitMessage = message ?? string.Empty;
                string noteMessage = "studio-commit";
                LibGit2Sharp.Signature signature = GetDeveloperSignature();

                CommandsExtensions.StageAllChanges(repo);
                LibGit2Sharp.Commit commit = repo.Commit(commitMessage, signature, signature);
                NoteCollection notes = repo.Notes;
                notes.Add(commit.Id, noteMessage, signature, signature, notes.DefaultNamespace);
            }
        }

        /// <inheritdoc/>
        public RebaseResult RebaseOntoDefaultBranch(AltinnRepoEditingContext editingContext)
        {
            using LibGit2Sharp.Repository repo = CreateLocalRepo(editingContext);

            Identity identity = GetDefaultIdentity(editingContext.Developer);
            RebaseOptions rebaseOptions = new() { FileConflictStrategy = CheckoutFileConflictStrategy.Ours };

            Branch upstream = repo.Branches.FirstOrDefault(b => b.FriendlyName.Equals(DefaultBranch))
                ?? throw new InvalidOperationException($"Default branch '{DefaultBranch}' not found locally.");

            RebaseResult rebaseResult = repo.Rebase.Start(
                repo.Head,
                upstream,
                null,
                identity,
                rebaseOptions
            );

            if (rebaseResult.Status == RebaseStatus.Conflicts)
            {
                repo.Rebase.Abort();
                logger.LogError("Rebase onto latest commit on default branch resulted in conflicts for repo at {WorkingDirectory}. Rebase aborted.", repo.Info.WorkingDirectory);
            }

            if (rebaseResult.Status == RebaseStatus.Stop)
            {
                repo.Rebase.Abort();
                throw new InvalidOperationException("Rebase onto latest commit on default branch was stopped by user."); // Should be unreachable code.
            }
            return rebaseResult;
        }

        /// <inheritdoc/>
        public void CreateLocalBranch(AltinnRepoEditingContext editingContext, string branchName, string commitSha = null)
        {
            using LibGit2Sharp.Repository repo = CreateLocalRepo(editingContext);

            Branch branch = repo.Branches.FirstOrDefault(branch => branch.FriendlyName == branchName);
            if (branch is not null) { return; }

            if (commitSha is null)
            {
                repo.CreateBranch(branchName);
                return;
            }
            LibGit2Sharp.Commit commit = repo.Lookup<LibGit2Sharp.Commit>(commitSha);
            if (commit is null)
            {
                throw new ArgumentException($"Commit '{commitSha}' not found in repository.", nameof(commitSha));
            }
            repo.CreateBranch(branchName, commit);
        }

        public async Task DeleteRemoteBranchIfExists(AltinnRepoEditingContext editingContext, string branchName)
        {
            await FetchRemoteChanges(editingContext.Org, editingContext.Repo);

            using LibGit2Sharp.Repository repo = CreateLocalRepo(editingContext);

            if (RemoteBranchExists(branchName, repo) is false)
            {
                return; // Nothing to delete
            }

            Remote remote = repo.Network.Remotes["origin"];
            PushOptions options = new()
            {
                CredentialsProvider = await GetCredentialsAsync()
            };
            string pushRefSpec = $":refs/heads/{branchName}";
            repo.Network.Push(remote, pushRefSpec, options);
        }

        /// <inheritdoc/>
        public void DeleteLocalBranchIfExists(AltinnRepoEditingContext editingContext, string branchName)
        {
            using LibGit2Sharp.Repository repo = CreateLocalRepo(editingContext);

            if (LocalBranchIsHead(repo, branchName))
            {
                string defaultBranchName = repo.Branches.Single(branch => branch.FriendlyName == DefaultBranch).FriendlyName;
                CheckoutRepoOnBranch(editingContext, defaultBranchName);
            }

            if (LocalBranchExists(repo, branchName))
            {
                repo.Branches.Remove(branchName);
            }
        }

        /// <inheritdoc/>
        public void CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName)
        {
            using LibGit2Sharp.Repository repo = CreateLocalRepo(editingContext);

            Branch branch = repo.Branches.FirstOrDefault(b => b.FriendlyName == branchName);

            if (branch == null)
            {
                Branch remoteBranch = repo.Branches.FirstOrDefault(b =>
                    b.IsRemote && (b.FriendlyName == $"origin/{branchName}" || b.FriendlyName.EndsWith($"/{branchName}")));

                if (remoteBranch != null)
                {
                    branch = repo.CreateBranch(branchName, remoteBranch.Tip);
                    branch = repo.Branches.Update(branch, b => b.TrackedBranch = remoteBranch.CanonicalName);
                }
                else
                {
                    throw new InvalidOperationException($"Branch '{branchName}' not found in local or remote branches.");
                }
            }

            Commands.Checkout(repo, branch);
        }

        /// <inheritdoc/>
        public void MergeBranchIntoHead(AltinnRepoEditingContext editingContext, string featureBranch)
        {
            string localPath = FindLocalRepoLocation(editingContext);
            using LibGit2Sharp.Repository repo = new(localPath);

            Branch branch = repo.Branches.Single(branch => branch.FriendlyName == featureBranch);
            LibGit2Sharp.Signature signature = GetDeveloperSignature();
            MergeResult result = repo.Merge(branch, signature);
            if (result.Status == MergeStatus.Conflicts)
            {
                repo.Reset(ResetMode.Hard, repo.Head.Tip);
                throw new InvalidOperationException("Merge failed; repository reset to pre-merge HEAD.");
            }
        }

        public CurrentBranchInfo GetCurrentBranch(string org, string repository, string developer)
        {
            string localPath = repositorySettings.GetServicePath(org, repository, developer);

            using LibGit2Sharp.Repository repo = new(localPath);
            return new CurrentBranchInfo
            {
                BranchName = repo.Head.FriendlyName,
                CommitSha = repo.Head.Tip?.Sha,
                IsTracking = repo.Head.IsTracking,
                RemoteName = repo.Head.TrackedBranch?.FriendlyName
            };
        }

        public async Task<RepoStatus> CheckoutBranchWithValidation(string org, string repository, string branchName)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            RepoStatus repoStatus = RepositoryStatus(org, repository, developer);

            bool hasUncommittedChanges = repoStatus.ContentStatus
                .Any(c => c.FileStatus != Enums.FileStatus.Unaltered);

            if (hasUncommittedChanges)
            {
                var error = new UncommittedChangesError
                {
                    Error = "Cannot switch branches with uncommitted changes",
                    Message = "You have uncommitted changes. Please commit and push your changes, or discard them before switching branches.",
                    UncommittedFiles = repoStatus.ContentStatus
                        .Where(c => c.FileStatus != Enums.FileStatus.Unaltered)
                        .Select(c => new UncommittedFile
                        {
                            FilePath = c.FilePath,
                            Status = c.FileStatus.ToString()
                        })
                        .ToList(),
                    CurrentBranch = repoStatus.CurrentBranch,
                    TargetBranch = branchName
                };

                throw new Exceptions.UncommittedChangesException(error);
            }

            await FetchRemoteChanges(org, repository);
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repository, developer);
            CheckoutRepoOnBranch(editingContext, branchName);
            return RepositoryStatus(org, repository, developer);
        }

        /// <inheritdoc/>
        public RepoStatus DiscardLocalChanges(string org, string repository)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string localPath = repositorySettings.GetServicePath(org, repository, developer);

            using (var repo = new LibGit2Sharp.Repository(localPath))
            {
                repo.Reset(ResetMode.Hard, repo.Head.Tip);
                repo.RemoveUntrackedFiles();
            }

            return RepositoryStatus(org, repository, developer);
        }

        /// <summary>
        /// Returns the remote repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The path to the remote repo</returns>
        private string FindRemoteRepoLocation(string org, string repository)
        {
            return new Uri(repositorySettings.RepositoryBaseURL).Append($"{org}/{repository}.git").ToString();
        }

        /// <summary>
        /// Stages a specific file changed in working repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository.</param>
        /// <param name="fileName">the entire file path with filen name</param>
        public void StageChange(string org, string repository, string fileName)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string localServiceRepoFolder = repositorySettings.GetServicePath(org, repository, developer);
            using (LibGit2Sharp.Repository repo = new(localServiceRepoFolder))
            {
                FileStatus fileStatus = repo.RetrieveStatus().SingleOrDefault(file => file.FilePath == fileName).State;

                if (fileStatus == FileStatus.ModifiedInWorkdir ||
                    fileStatus == FileStatus.NewInWorkdir ||
                    fileStatus == FileStatus.Conflicted)
                {
                    Commands.Stage(repo, fileName);
                }
            }
        }

        /// <inheritdoc/>
        public async Task<RepositoryClient.Model.Branch> CreateBranch(string org, string repository, string branchName)
        {
            return await giteaClient.CreateBranch(org, repository, branchName);
        }

        /// <inheritdoc/>
        public async Task<bool> CreatePullRequest(string org, string repository, string target, string source, string title)
        {
            CreatePullRequestOption option = new()
            {
                Base = target,
                Head = source,
                Title = title
            };

            return await giteaClient.CreatePullRequest(org, repository, option);
        }

        /// <inheritdoc/>
        public async Task DeleteRepository(string org, string repository)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            string localServiceRepoFolder = repositorySettings.GetServicePath(org, repository, developer);

            if (Directory.Exists(localServiceRepoFolder))
            {
                DirectoryHelper.DeleteFilesAndDirectory(localServiceRepoFolder);
            }

            await giteaClient.DeleteRepository(org, repository);
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

        private LibGit2Sharp.Signature GetDeveloperSignature()
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
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

        private async Task<LibGit2Sharp.Handlers.CredentialsHandler> GetCredentialsAsync(string accessToken = "")
        {
            string token = string.IsNullOrEmpty(accessToken)
                ? await httpContextAccessor.HttpContext.GetDeveloperAppTokenAsync()
                : accessToken;
            return (url, user, cred) => new UsernamePasswordCredentials { Username = token, Password = string.Empty };
        }

        public async Task FetchGitNotes(AltinnRepoEditingContext editingContext)
        {
            string repoLocation = FindLocalRepoLocation(editingContext);
            await FetchGitNotes(repoLocation);
        }

        private async Task FetchGitNotes(string localRepositoryPath)
        {
            using LibGit2Sharp.Repository repo = new(localRepositoryPath);
            FetchOptions options = new()
            {
                CredentialsProvider = await GetCredentialsAsync()
            };
            Commands.Fetch(repo, "origin", ["refs/notes/*:refs/notes/*"], options, "fetch notes");
        }
    }
}

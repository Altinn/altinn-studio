using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
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
    public class SourceControlSI : ISourceControl
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IGitea _gitea;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SourceControlSI"/> class.
        /// </summary>
        /// <param name="repositorySettings">The settings for the service repository.</param>
        /// <param name="httpContextAccessor">the http context accessor.</param>
        /// <param name="gitea">gitea.</param>
        /// <param name="logger">the log handler.</param>
        public SourceControlSI(
            ServiceRepositorySettings repositorySettings,
            IHttpContextAccessor httpContextAccessor,
            IGitea gitea,
            ILogger<SourceControlSI> logger)
        {
            _settings = repositorySettings;
            _httpContextAccessor = httpContextAccessor;
            _gitea = gitea;
            _logger = logger;
        }

        /// <summary>
        /// Clone remote repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The result of the cloning</returns>
        public async Task<string> CloneRemoteRepository(string org, string repository)
        {
            string remoteRepo = FindRemoteRepoLocation(org, repository);
            CloneOptions cloneOptions = new();
            cloneOptions.FetchOptions.CredentialsProvider = await GetCredentialsAsync();
            string localPath = FindLocalRepoLocation(org, repository);
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
            using (var repo = new LibGit2Sharp.Repository(FindLocalRepoLocation(org, repository)))
            {
                PullOptions pullOptions = new()
                {
                    MergeOptions = new MergeOptions()
                    {
                        FastForwardStrategy = FastForwardStrategy.Default,
                    },
                };
                pullOptions.FetchOptions = new FetchOptions();
                pullOptions.FetchOptions.CredentialsProvider = await GetCredentialsAsync();

                try
                {
                    Tree head = repo.Head.Tip.Tree;
                    MergeResult mergeResult = Commands.Pull(
                        repo,
                        new LibGit2Sharp.Signature("my name", "my email", DateTimeOffset.Now), // I dont want to provide these
                        pullOptions);

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
                    _logger.LogError($"SourceControlSI // PullRemoteChanges // CheckoutConflictException occured when pulling repo {FindLocalRepoLocation(org, repository)}. {e}");
                    status.RepositoryStatus = Enums.RepositoryStatus.CheckoutConflict;
                }
                catch (Exception e)
                {
                    _logger.LogError($"SourceControlSI // PullRemoteChanges // Exception occured when pulling repo {FindLocalRepoLocation(org, repository)}. {e}");
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
            string logMessage = string.Empty;
            using (var repo = new LibGit2Sharp.Repository(FindLocalRepoLocation(org, repository)))
            {
                FetchOptions fetchOptions = new();
                fetchOptions.CredentialsProvider = await GetCredentialsAsync();

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

        /// <summary>
        /// Add all changes in app repo and push to remote
        /// </summary>
        /// <param name="commitInfo">the commit information for the app</param>
        public async Task PushChangesForRepository(CommitInfo commitInfo)
        {
            string localServiceRepoFolder = _settings.GetServicePath(commitInfo.Org, commitInfo.Repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            await CommitAndPushToBranch(commitInfo.Org, commitInfo.Repository, "master", localServiceRepoFolder, commitInfo.Message);
        }

        /// <summary>
        /// Push commits to repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        public async Task<bool> Push(string org, string repository)
        {
            bool pushSuccess = true;
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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
                    _logger.LogError("Push error: {0}", pushError.Message);
                    pushSuccess = false;
                }
            };
            options.CredentialsProvider = await GetCredentialsAsync();

            repo.Network.Push(remote, @"refs/heads/master", options);
            repo.Network.Push(remote, "refs/notes/commits", options);

            return pushSuccess;
        }

        /// <summary>
        /// Commit changes for repository
        /// </summary>
        /// <param name="commitInfo">Information about the commit</param>
        public void Commit(CommitInfo commitInfo)
        {
            CommitAndAddStudioNote(commitInfo.Org, commitInfo.Repository, commitInfo.Message);
        }

        private void CommitAndAddStudioNote(string org, string repository, string message)
        {
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localServiceRepoFolder);
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
            var commit = repo.Commit(message, signature, signature);

            var notes = repo.Notes;
            notes.Add(commit.Id, "studio-commit", signature, signature, notes.DefaultNamespace);

        }

        /// <summary>
        /// List the GIT status of a repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>A list of changed files in the repository</returns>
        public List<RepositoryContent> Status(string org, string repository)
        {
            List<RepositoryContent> repoContent = new();
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                RepositoryStatus status = repo.RetrieveStatus(new StatusOptions());
                foreach (StatusEntry item in status)
                {
                    RepositoryContent content = new();
                    content.FilePath = item.FilePath;
                    content.FileStatus = (Altinn.Studio.Designer.Enums.FileStatus)item.State;
                    repoContent.Add(content);
                }
            }

            return repoContent;
        }

        /// <inheritdoc/>
        public RepoStatus RepositoryStatus(string org, string repository)
        {
            RepoStatus repoStatus = new();
            repoStatus.ContentStatus = new List<RepositoryContent>();
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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
            }

            return repoStatus;
        }

        /// <inheritdoc/>
        public async Task<Dictionary<string, string>> GetChangedContent(string org, string repository)
        {
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            Dictionary<string, string> fileDiffs = new Dictionary<string, string>();
            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                await FetchRemoteChanges(org, repository);
                var remoteMainBranch = repo.Branches["refs/remotes/origin/master"];
                if (remoteMainBranch == null || remoteMainBranch.Tip == null)
                {
                    return fileDiffs;
                }
                var remoteMainCommit = remoteMainBranch.Tip;

                var changes = repo.Diff.Compare<TreeChanges>(remoteMainCommit.Tree, DiffTargets.WorkingDirectory);
                foreach (var change in changes)
                {
                    Patch patch = repo.Diff.Compare<Patch>(remoteMainCommit.Tree, DiffTargets.WorkingDirectory, new[] { change.Path });
                    fileDiffs[change.Path] = patch.Content;
                }

                return fileDiffs;
            }
        }

        /// <summary>
        /// Gets the latest commit for current user
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The latest commit</returns>
        public Altinn.Studio.Designer.Models.Commit GetLatestCommitForCurrentUser(string org, string repository)
        {
            List<Altinn.Studio.Designer.Models.Commit> commits = Log(org, repository);
            var developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            Altinn.Studio.Designer.Models.Commit latestCommit = commits.FirstOrDefault(commit => commit.Author.Name == developer);
            return latestCommit;
        }

        /// <summary>
        /// List commits
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>List of commits</returns>
        public List<Altinn.Studio.Designer.Models.Commit> Log(string org, string repository)
        {
            List<Altinn.Studio.Designer.Models.Commit> commits = new();
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                foreach (LibGit2Sharp.Commit c in repo.Commits.Take(50))
                {
                    Designer.Models.Commit commit = new();
                    commit.Message = c.Message;
                    commit.MessageShort = c.MessageShort;
                    commit.Encoding = c.Encoding;
                    commit.Sha = c.Sha;

                    commit.Author = new Designer.Models.Signature();
                    commit.Author.Email = c.Author.Email;
                    commit.Author.Name = c.Author.Name;
                    commit.Author.When = c.Author.When;

                    commit.Comitter = new Designer.Models.Signature();
                    commit.Comitter.Name = c.Committer.Name;
                    commit.Comitter.Email = c.Committer.Email;
                    commit.Comitter.When = c.Committer.When;

                    commits.Add(commit);
                }
            }

            return commits;
        }

        /// <summary>
        /// Method for storing AppToken in Developers folder. This is not the permanent solution
        /// </summary>
        /// <param name="token">The token</param>
        public void StoreAppTokenForUser(string token)
        {
            CheckAndCreateDeveloperFolder();

            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string path = Path.Combine(_settings.RepositoryLocation, developer, "AuthToken.txt");
            File.WriteAllText(path, token);
        }

        /// <summary>
        /// Verifies if there exist a developer folder
        /// </summary>
        private void CheckAndCreateDeveloperFolder()
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string path = Path.Combine(_settings.RepositoryLocation, developer);

            if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(path);
            }
        }

        /// <summary>
        /// Returns the local repo location
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The path to the local repository</returns>
        public string FindLocalRepoLocation(string org, string repository)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

            return Path.Combine(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") ?? _settings.RepositoryLocation, developer, org, repository);
        }

        /// <inheritdoc />
        public async Task VerifyCloneExists(string org, string repository)
        {
            string repoLocation = FindLocalRepoLocation(org, repository);
            if (!Directory.Exists(repoLocation))
            {
                try
                {
                    await CloneRemoteRepository(org, repository);
                }
                catch (Exception e)
                {
                    _logger.LogError($"Failed to clone repository {org}/{repository} with exception: {e}");
                }
            }
        }

        private async Task CommitAndPushToBranch(string org, string repository, string branchName, string localPath, string message, string accessToken = "")
        {
            using LibGit2Sharp.Repository repo = new(localPath);
            // Restrict users from empty commit
            if (repo.RetrieveStatus().IsDirty)
            {
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
                var commit = repo.Commit(message, signature, signature);
                var notes = repo.Notes;
                notes.Add(commit.Id, "studio-commit", signature, signature, notes.DefaultNamespace);

                PushOptions options = new();
                options.CredentialsProvider = await GetCredentialsAsync(accessToken);

                if (branchName == "master")
                {
                    repo.Network.Push(remote, @"refs/heads/master", options);
                    repo.Network.Push(remote, "refs/notes/commits", options);

                    return;
                }

                Branch b = repo.Branches[branchName];
                repo.Network.Push(b, options);
                repo.Network.Push(remote, "refs/notes/commits", options);
            }
        }

        /// <summary>
        /// Returns the remote repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The path to the remote repo</returns>
        private string FindRemoteRepoLocation(string org, string repository)
        {
            return new Uri(_settings.RepositoryBaseURL).Append($"{org}/{repository}.git").ToString();
        }

        /// <summary>
        /// Stages a specific file changed in working repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository.</param>
        /// <param name="fileName">the entire file path with filen name</param>
        public void StageChange(string org, string repository, string fileName)
        {
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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
            return await _gitea.CreateBranch(org, repository, branchName);
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

            return await _gitea.CreatePullRequest(org, repository, option);
        }

        /// <inheritdoc/>
        public async Task DeleteRepository(string org, string repository)
        {
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));

            if (Directory.Exists(localServiceRepoFolder))
            {
                DirectoryHelper.DeleteFilesAndDirectory(localServiceRepoFolder);
            }

            await _gitea.DeleteRepository(org, repository);
        }

        private LibGit2Sharp.Signature GetDeveloperSignature()
        {
            var username = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            return new LibGit2Sharp.Signature(username, $"{username}@noreply.altinn.studio", DateTime.Now);
        }

        private async Task<LibGit2Sharp.Handlers.CredentialsHandler> GetCredentialsAsync(string accessToken = "")
        {
            string token = string.IsNullOrEmpty(accessToken)
                ? await _httpContextAccessor.HttpContext.GetDeveloperAppTokenAsync()
                : accessToken;
            return (url, user, cred) => new UsernamePasswordCredentials { Username = token, Password = string.Empty };
        }

        private async Task FetchGitNotes(string localRepositoryPath)
        {
            using var repo = new LibGit2Sharp.Repository(localRepositoryPath);
            var options = new FetchOptions()
            {
                CredentialsProvider = await GetCredentialsAsync()
            };
            Commands.Fetch(repo, "origin", new List<string> { "refs/notes/*:refs/notes/*" }, options, "fetch notes");
        }
    }
}

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;

using LibGit2Sharp;

using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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
        /// <param name="generalSettings">The current general settings.</param>
        /// <param name="defaultFileFactory">The default factory.</param>
        /// <param name="httpContextAccessor">the http context accessor.</param>
        /// <param name="gitea">gitea.</param>
        /// <param name="logger">the log handler.</param>
        public SourceControlSI(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IOptions<GeneralSettings> generalSettings,
            IDefaultFileFactory defaultFileFactory,
            IHttpContextAccessor httpContextAccessor,
            IGitea gitea,
            ILogger<SourceControlSI> logger)
        {
            _settings = repositorySettings.Value;
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
        public string CloneRemoteRepository(string org, string repository)
        {
            string remoteRepo = FindRemoteRepoLocation(org, repository);
            CloneOptions cloneOptions = new CloneOptions();
            cloneOptions.CredentialsProvider = (a, b, c) => new UsernamePasswordCredentials { Username = GetAppToken(), Password = string.Empty };
            return LibGit2Sharp.Repository.Clone(remoteRepo, FindLocalRepoLocation(org, repository), cloneOptions);
        }

        /// <inheritdoc />
        public string CloneRemoteRepository(string org, string repository, string destinationPath, string branchName = "")
        {
            string remoteRepo = FindRemoteRepoLocation(org, repository);
            CloneOptions cloneOptions = new CloneOptions();
            cloneOptions.CredentialsProvider = (a, b, c) => new UsernamePasswordCredentials { Username = GetAppToken(), Password = string.Empty };

            if (!string.IsNullOrEmpty(branchName))
            {
                cloneOptions.BranchName = branchName;
            }

            return LibGit2Sharp.Repository.Clone(remoteRepo, destinationPath, cloneOptions);
        }

        /// <inheritdoc />
        public bool IsLocalRepo(string org, string repository)
        {
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            if (Directory.Exists(localServiceRepoFolder))
            {
                try
                {
                    using (LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
                    {
                        return true;
                    }
                }
                catch (Exception)
                {
                    return false;
                }
            }

            return false;
        }

        /// <inheritdoc />
        public RepoStatus PullRemoteChanges(string org, string repository)
        {
            RepoStatus status = new RepoStatus();
            using (var repo = new LibGit2Sharp.Repository(FindLocalRepoLocation(org, repository)))
            {
                PullOptions pullOptions = new PullOptions()
                {
                    MergeOptions = new MergeOptions()
                    {
                        FastForwardStrategy = FastForwardStrategy.Default,
                    },
                };
                pullOptions.FetchOptions = new FetchOptions();
                pullOptions.FetchOptions.CredentialsProvider = (_url, _user, _cred) =>
                        new UsernamePasswordCredentials { Username = GetAppToken(), Password = string.Empty };

                try
                {
                    MergeResult mergeResult = Commands.Pull(
                        repo,
                        new LibGit2Sharp.Signature("my name", "my email", DateTimeOffset.Now), // I dont want to provide these
                        pullOptions);

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
        public void FetchRemoteChanges(string org, string repository)
        {
            string logMessage = string.Empty;
            using (var repo = new LibGit2Sharp.Repository(FindLocalRepoLocation(org, repository)))
            {
                FetchOptions fetchOptions = new FetchOptions();
                fetchOptions.CredentialsProvider = (_url, _user, _cred) =>
                         new UsernamePasswordCredentials { Username = GetAppToken(), Password = string.Empty };

                foreach (Remote remote in repo?.Network?.Remotes)
                {
                    IEnumerable<string> refSpecs = remote.FetchRefSpecs.Select(x => x.Specification);
                    Commands.Fetch(repo, remote.Name, refSpecs, fetchOptions, logMessage);
                }
            }
        }

        /// <summary>
        /// Gets the number of commits the local repository is behind the remote
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The number of commits behind</returns>
        public int? CheckRemoteUpdates(string org, string repository)
        {
            using (var repo = new LibGit2Sharp.Repository(FindLocalRepoLocation(org, repository)))
            {
                LibGit2Sharp.Branch branch = repo.Branches["master"];
                if (branch == null)
                {
                    return null;
                }

                return branch.TrackingDetails.BehindBy;
            }
        }

        /// <inheritdoc/>
        public void CommitAndPushChanges(string org, string repository, string branchName, string localPath, string message)
        {
            CommitAndPushToBranch(org, repository, branchName, localPath, message);
        }

        /// <summary>
        /// Add all changes in app repo and push to remote
        /// </summary>
        /// <param name="commitInfo">the commit information for the app</param>
        public void PushChangesForRepository(CommitInfo commitInfo)
        {
            string localServiceRepoFolder = _settings.GetServicePath(commitInfo.Org, commitInfo.Repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            CommitAndPushToBranch(commitInfo.Org, commitInfo.Repository, "master", localServiceRepoFolder, commitInfo.Message);
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
            using (LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                string remoteUrl = FindRemoteRepoLocation(org, repository);
                Remote remote = repo.Network.Remotes["origin"];

                if (!remote.PushUrl.Equals(remoteUrl))
                {
                    // This is relevant when we switch beteen running designer in local or in docker. The remote URL changes.
                    // Requires adminstrator access to update files.
                    repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
                }

                PushOptions options = new PushOptions
                {
                    OnPushStatusError = pushError =>
                    {
                        _logger.LogError("Push error: {0}", pushError.Message);
                        pushSuccess = false;
                    }
                };
                options.CredentialsProvider = (_url, _user, _cred) =>
                        new UsernamePasswordCredentials { Username = GetAppToken(), Password = string.Empty };

                repo.Network.Push(remote, @"refs/heads/master", options);
            }

            return await Task.FromResult(pushSuccess);
        }

        /// <summary>
        /// Commit changes for repository
        /// </summary>
        /// <param name="commitInfo">Information about the commit</param>
        public void Commit(CommitInfo commitInfo)
        {
            string localServiceRepoFolder = _settings.GetServicePath(commitInfo.Org, commitInfo.Repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                string remoteUrl = FindRemoteRepoLocation(commitInfo.Org, commitInfo.Repository);
                Remote remote = repo.Network.Remotes["origin"];

                if (!remote.PushUrl.Equals(remoteUrl))
                {
                    // This is relevant when we switch beteen running designer in local or in docker. The remote URL changes.
                    // Requires adminstrator access to update files.
                    repo.Network.Remotes.Update("origin", r => r.Url = remoteUrl);
                }

                Commands.Stage(repo, "*");

                LibGit2Sharp.Signature signature = GetDeveloperSignature();
                repo.Commit(commitInfo.Message, signature, signature);
            }
        }

        /// <summary>
        /// List the GIT status of a repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>A list of changed files in the repository</returns>
        public List<RepositoryContent> Status(string org, string repository)
        {
            List<RepositoryContent> repoContent = new List<RepositoryContent>();
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                RepositoryStatus status = repo.RetrieveStatus(new LibGit2Sharp.StatusOptions());
                foreach (StatusEntry item in status)
                {
                    RepositoryContent content = new RepositoryContent();
                    content.FilePath = item.FilePath;
                    repoContent.Add(content);
                }
            }

            return repoContent;
        }

        /// <summary>
        /// Gives the complete repository status
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <returns>The repository status</returns>
        public RepoStatus RepositoryStatus(string org, string repository)
        {
            RepoStatus repoStatus = new RepoStatus();
            repoStatus.ContentStatus = new List<RepositoryContent>();
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                RepositoryStatus status = repo.RetrieveStatus(new LibGit2Sharp.StatusOptions());
                foreach (StatusEntry item in status)
                {
                    RepositoryContent content = new RepositoryContent();
                    content.FilePath = item.FilePath;
                    content.FileStatus = (Enums.FileStatus)(int)item.State;
                    if (content.FileStatus == Enums.FileStatus.Conflicted)
                    {
                        repoStatus.RepositoryStatus = Enums.RepositoryStatus.MergeConflict;
                        repoStatus.HasMergeConflict = true;
                    }

                    repoStatus.ContentStatus.Add(content);
                }

                LibGit2Sharp.Branch branch = repo.Branches.FirstOrDefault(b => b.IsTracking);
                if (branch != null)
                {
                    repoStatus.AheadBy = branch.TrackingDetails.AheadBy;
                    repoStatus.BehindBy = branch.TrackingDetails.BehindBy;
                }
            }

            return repoStatus;
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
            var currentUser = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            Altinn.Studio.Designer.Models.Commit latestCommit = commits.FirstOrDefault(commit => commit.Author.Name == currentUser);
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
            List<Altinn.Studio.Designer.Models.Commit> commits = new List<Designer.Models.Commit>();
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                foreach (LibGit2Sharp.Commit c in repo.Commits.Take(50))
                {
                    Designer.Models.Commit commit = new Designer.Models.Commit();
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

        /// <inheritdoc />
        public Designer.Models.Commit GetInitialCommit(string org, string repository)
        {
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            Designer.Models.Commit commit = null;

            using (var repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                if (repo.Commits.Last() != null)
                {
                    LibGit2Sharp.Commit firstCommit = repo.Commits.Last();
                    commit = new Designer.Models.Commit();
                    commit.Message = firstCommit.Message;
                    commit.MessageShort = firstCommit.MessageShort;
                    commit.Encoding = firstCommit.Encoding;
                    commit.Sha = firstCommit.Sha;

                    commit.Author = new Designer.Models.Signature();
                    commit.Author.Email = firstCommit.Author.Email;
                    commit.Author.Name = firstCommit.Author.Name;
                    commit.Author.When = firstCommit.Author.When;

                    commit.Comitter = new Designer.Models.Signature();
                    commit.Comitter.Name = firstCommit.Committer.Name;
                    commit.Comitter.Email = firstCommit.Committer.Email;
                    commit.Comitter.When = firstCommit.Committer.When;
                }
                else
                {
                    _logger.LogError($" // SourceControlSI // GetInitialCommit // Error occured when retrieving first commit for repo {localServiceRepoFolder}");
                    return null;
                }

                return commit;
            }
        }

        /// <summary>
        /// Creates the remote repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="options">Options for the remote repository</param>
        /// <returns>The repostory from API</returns>
        public async Task<RepositoryClient.Model.Repository> CreateRepository(string org, Altinn.Studio.Designer.RepositoryClient.Model.CreateRepoOption options)
        {
            return await _gitea.CreateRepository(org, options);
        }

        /// <summary>
        /// Method for storing AppToken in Developers folder. This is not the permanent solution
        /// </summary>
        /// <param name="token">The token</param>
        public void StoreAppTokenForUser(string token)
        {
            CheckAndCreateDeveloperFolder();

            string userName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string path = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation");
            path = (path != null)
                ? $"{path}{userName}/AuthToken.txt"
                : $"{_settings.RepositoryLocation}{userName}/AuthToken.txt";

            File.WriteAllText(path, token);
        }

        /// <summary>
        /// Return the App Token generated to let AltinnCore contact GITEA on behalf of app developer
        /// </summary>
        /// <returns>The app token</returns>
        public string GetAppToken()
        {
            return AuthenticationHelper.GetDeveloperAppToken(_httpContextAccessor.HttpContext);
        }

        /// <summary>
        /// Return the App Token id generated to let AltinnCore contact GITEA on behalf of app developer
        /// </summary>
        /// <returns>The app token id</returns>
        public string GetAppTokenId()
        {
            return AuthenticationHelper.GetDeveloperAppTokenId(_httpContextAccessor.HttpContext);
        }

        /// <summary>
        /// Return the deploy Token generated to let azure devops pipeline clone private GITEA repos on behalf of app developer
        /// </summary>
        /// <returns>The deploy app token</returns>
        public async Task<string> GetDeployToken()
        {
            string deployToken = string.Empty;

            KeyValuePair<string, string> deployKeyValuePair = await _gitea.GetSessionAppKey("AltinnDeployToken") ?? default(KeyValuePair<string, string>);
            if (!deployKeyValuePair.Equals(default(KeyValuePair<string, string>)))
            {
                deployToken = deployKeyValuePair.Value;
            }

            return deployToken;
        }

        /// <summary>
        /// Verifies if there exist a developer folder
        /// </summary>
        private void CheckAndCreateDeveloperFolder()
        {
            string userName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string path = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation");
            path = (path != null) ? $"{path}{userName}/" : $"{_settings.RepositoryLocation}{userName}/";

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
            string userName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string envRepoLocation = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation");

            return (envRepoLocation != null)
                ? $"{envRepoLocation}{userName}/{org}/{repository}"
                : $"{_settings.RepositoryLocation}{userName}/{org}/{repository}";
        }

        /// <inheritdoc />
        public void VerifyCloneExists(string org, string repository)
        {
            string repoLocation = FindLocalRepoLocation(org, repository);
            if (!Directory.Exists(repoLocation))
            {
                try
                {
                    CloneRemoteRepository(org, repository);
                }
                catch (Exception e)
                {
                    _logger.LogError($"Failed to clone repository {org}/{repository} with exception: {e}");
                }
            }
        }

        private void CommitAndPushToBranch(string org, string repository, string branchName, string localPath, string message)
        {
            using (LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localPath))
            {
                // Restrict users from empty commit
                if (repo.RetrieveStatus().IsDirty)
                {
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
                    repo.Commit(message, signature, signature);

                    PushOptions options = new PushOptions();
                    options.CredentialsProvider = (_url, _user, _cred) =>
                        new UsernamePasswordCredentials { Username = GetAppToken(), Password = string.Empty };

                    if (branchName == "master")
                    {
                        repo.Network.Push(remote, @"refs/heads/master", options);
                        return;
                    }

                    Branch b = repo.Branches[branchName];
                    repo.Network.Push(b, options);
                }
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
            string reposBaseUrl = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL");

            return (reposBaseUrl != null)
                ? $"{reposBaseUrl}/{org}/{repository}.git"
                : $"{_settings.RepositoryBaseURL}/{org}/{repository}.git";
        }

        /// <summary>
        /// Discards all local changes for the logged in user and the local repository is updated with latest remote commit (origin/master)
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        public void ResetCommit(string org, string repository)
        {
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                if (repo.RetrieveStatus().IsDirty)
                {
                    repo.Reset(ResetMode.Hard, "origin/master");
                    repo.RemoveUntrackedFiles();
                }
            }
        }

        /// <summary>
        /// Discards local changes to a specific file and the file is updated with latest remote commit (origin/master)
        /// by checking out the specific file.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <param name="fileName">the name of the file</param>
        public void CheckoutLatestCommitForSpecificFile(string org, string repository, string fileName)
        {
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                CheckoutOptions checkoutOptions = new CheckoutOptions
                {
                    CheckoutModifiers = CheckoutModifiers.Force,
                };

                repo.CheckoutPaths("origin/master", new[] { fileName }, checkoutOptions);
            }
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
            using (LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
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

        /// <summary>
        /// Halts the merge operation and keeps local changes.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        public void AbortMerge(string org, string repository)
        {
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localServiceRepoFolder))
            {
                if (repo.RetrieveStatus().IsDirty)
                {
                    repo.Reset(ResetMode.Hard, "heads/master");
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
            CreatePullRequestOption option = new CreatePullRequestOption
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
            return new LibGit2Sharp.Signature(AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext), "@jugglingnutcase", DateTime.Now);
        }
    }
}

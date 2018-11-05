using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using LibGit2Sharp;
using LibGit2Sharp.Handlers;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;

namespace AltinnCore.Common.Services.Implementation
{
    public class SourceControlSI : ISourceControl
    {
        private readonly IDefaultFileFactory _defaultFileFactory;
        private readonly ServiceRepositorySettings _settings;
        private readonly GeneralSettings _generalSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IGitea _gitea;

        /// <summary>
        /// Initializes a new instance of the <see cref="RepositorySI"/> class 
        /// </summary>
        /// <param name="repositorySettings">The settings for the service repository</param>
        /// <param name="generalSettings">The current general settings</param>
        /// <param name="defaultFileFactory">The default factory</param>
        public SourceControlSI(IOptions<ServiceRepositorySettings> repositorySettings,
                IOptions<GeneralSettings> generalSettings, IDefaultFileFactory defaultFileFactory, IHttpContextAccessor httpContextAccessor, IGitea gitea)
        {
            _defaultFileFactory = defaultFileFactory;
            _settings = repositorySettings.Value;
            _generalSettings = generalSettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _gitea = gitea;
        }

        /// <summary>
        /// Clone remote repository
        /// </summary>
        /// <param name="org"></param>
        /// <param name="repository"></param>
        public void CloneRemoteRepository(string org, string repository)
        {
            string remoteRepo = FindRemoteRepoLocation(org, repository);
            CloneOptions cloneOptions = new CloneOptions();
            cloneOptions.CredentialsProvider = (a, b, c) => new UsernamePasswordCredentials { Username = GetAppToken(), Password = "" };
            Repository.Clone(remoteRepo, FindLocalRepoLocation(org, repository), cloneOptions);
        }

        /// <summary>
        /// Verifies if developer has a local repo
        /// </summary>
        /// <param name="org"></param>
        /// <param name="service"></param>
        /// <returns></returns>
        public bool IsLocalRepo(string org, string service)
        {
            string localServiceRepoFolder = _settings.GetServicePath(org, service, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            if (Directory.Exists(localServiceRepoFolder))
            {
                try
                {
                    using (Repository repo = new Repository(localServiceRepoFolder))
                    {
                        return true;
                    }
                }
                catch (Exception ex)
                {
                    return false;
                }
            }

            return false;
        }

        public void PullRemoteChanges(string org, string repository)
        {
            using (var repo = new Repository(FindLocalRepoLocation(org, repository)))
            {
                PullOptions pullOptions = new PullOptions()
                {
                    MergeOptions = new MergeOptions()
                    {
                        FastForwardStrategy = FastForwardStrategy.Default
                    }
                };

                pullOptions.FetchOptions = new FetchOptions();
                pullOptions.FetchOptions.CredentialsProvider = (_url, _user, _cred) =>
                        new UsernamePasswordCredentials { Username = GetAppToken(), Password = "" };

                MergeResult mergeResult = Commands.Pull(
                    repo,
                    new Signature("my name", "my email", DateTimeOffset.Now), // I dont want to provide these
                    pullOptions
                );
            }
        }

        /// <summary>
        /// Fetches the remote changes
        /// </summary>
        /// <param name="org"></param>
        /// <param name="repostory"></param>
        public void FetchRemoteChanges(string org, string repository)
        {
            string logMessage = "";
            using (var repo = new Repository(FindLocalRepoLocation(org, repository)))
            {
                FetchOptions fetchOptions = new FetchOptions();
                fetchOptions.CredentialsProvider = (_url, _user, _cred) =>
                         new UsernamePasswordCredentials { Username = GetAppToken(), Password = "" };

                foreach (Remote remote in repo.Network.Remotes)
                {
                    IEnumerable<string> refSpecs = remote.FetchRefSpecs.Select(x => x.Specification);
                    Commands.Fetch(repo, remote.Name, refSpecs, fetchOptions, logMessage);
                }
            }
        }

        /// <summary>
        /// Gets the number of commits the local repository is behind the remote
        /// </summary>
        /// <param name="org">The organization owning the repository</param>
        /// <param name="repository">The repository</param>
        /// <returns>The number of commits behind</returns>
        public int? CheckRemoteUpdates(string org, string repository)
        {
            using (var repo = new Repository(FindLocalRepoLocation(org, repository)))
            {
                Branch branch = repo.Branches["master"];
                if (branch == null)
                {
                    return null;
                }

                return branch.TrackingDetails.BehindBy;
            }
        }

        /// <summary>
        /// Add all changes in service repo and push to remote
        /// </summary>
        /// <param name="org">The owner organization</param>
        /// <param name="service">The service</param>
        public void PushChangesForRepository(CommitInfo commitInfo)
        {
            string localServiceRepoFolder = _settings.GetServicePath(commitInfo.Org, commitInfo.Repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (Repository repo = new Repository(localServiceRepoFolder))
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

                // Create the committer's signature and commit
                Signature author = new Signature(AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext), "@jugglingnutcase", DateTime.Now);
                Signature committer = author;

                // Commit to the repository
                Commit commit = repo.Commit(commitInfo.Message, author, committer);

                PushOptions options = new PushOptions();
                options.CredentialsProvider = (_url, _user, _cred) =>
                        new UsernamePasswordCredentials { Username = GetAppToken(), Password = "" };

                repo.Network.Push(remote, @"refs/heads/master", options);

            }
        }

        /// <summary>
        /// List the GIT status of a repositor
        /// </summary>
        /// <param name="org">The organization owning the repository</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>A list of changed files in the repository</returns>
        public List<RepositoryContent> Status(string org, string repository)
        {
            List<RepositoryContent> repoContent = new List<RepositoryContent>();
            string localServiceRepoFolder = _settings.GetServicePath(org, repository, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
            using (var repo = new Repository(localServiceRepoFolder))
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
        /// Creates the remote repository
        /// </summary>
        /// <param name="org">The owning organization</param>
        /// <param name="createRepoOption">Options for the remote repository</param>
        /// <returns>The repostory from API</returns>
        public AltinnCore.RepositoryClient.Model.Repository CreateRepository(string org, AltinnCore.RepositoryClient.Model.CreateRepoOption createRepoOption)
        {
            return _gitea.CreateRepositoryForOrg(AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName), org, createRepoOption).Result;
        }

        /// <summary>
        /// Method for storing AppToken in Developers folder. This is not the permanent solution 
        /// </summary>
        /// <param name="token">The</param>
        public void StoreAppTokenForUser(string token)
        {
            CheckAndCreateDeveloperFolder();
            string path = null;
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                path = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + "/AuthToken.txt";
            }
            else
            {
                path = _settings.RepositoryLocation + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + "/AuthToken.txt";
            }
            File.WriteAllText(path, token);
        }

        /// <summary>
        /// Return the App Token generated to let AltinnCore contact GITEA on behalf of service developer
        /// </summary>
        /// <returns></returns>
        public string GetAppToken()
        {
            string path = null;
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                path = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + "/AuthToken.txt";
            }
            else
            {
                path = _settings.RepositoryLocation + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + "/AuthToken.txt";
            }
            string token = null;

            if (File.Exists(path))
            {
                token = File.ReadAllText(path, Encoding.UTF8);
            }

            return token;
        }

        /// <summary>
        /// Verifies if there exist a developer folder
        /// </summary>
        private void CheckAndCreateDeveloperFolder()
        {
            string path = null;
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                path = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + "/";
            }
            else
            {
                path = _settings.RepositoryLocation + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + "/";
            }
            if (!Directory.Exists(path))
            {
                Directory.CreateDirectory(path);
            }
        }

        /// <summary>
        /// Returns the local 
        /// </summary>
        /// <param name="org">The organization owning the repostory</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns></returns>
        public string FindLocalRepoLocation(string org, string repository)
        {
            string localpath = null;
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                localpath = $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}/{repository}";
            }
            else
            {
                localpath = $"{_settings.RepositoryLocation}{AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)}/{org}/{repository}";
            }
            return localpath;
        }

        /// <summary>
        /// Returns the remote repo 
        /// </summary>
        /// <param name="org">The organization owning the repository</param>
        /// <param name="repository">The repository</param>
        /// <returns></returns>
        private string FindRemoteRepoLocation(string org, string repository)
        {
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") != null)
            {
                return $"{Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL")}{org}/{repository}.git";
            }
            else
            {
                return $"{_settings.RepositoryBaseURL}{org}/{repository}.git";
            }
        }
    }
}

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Decorates an implementation of ISourceControl by adding try/catch and
    /// explicit logging of issues introduced when using LibGit2Sharp.
    /// </summary>
    public class SourceControlLoggingDecorator : ISourceControl
    {
        private readonly ISourceControl _decoratedService;
        private readonly GeneralSettings _generalSettings;
        private readonly ILogger _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="SourceControlLoggingDecorator"/> class.
        /// </summary>
        /// <param name="decoratedService">The <see cref="ISourceControl"/> implementation to decorate.</param>
        /// <param name="generalSettings">General settings for the applicatoin.</param>
        /// <param name="logger">Instance of <see cref="ILogger"/></param>
        /// <param name="httpContextAccessor">Instance of <see cref="IHttpContextAccessor"/></param>
        public SourceControlLoggingDecorator(ISourceControl decoratedService, GeneralSettings generalSettings, ILogger<SourceControlLoggingDecorator> logger, IHttpContextAccessor httpContextAccessor)
        {
            _decoratedService = decoratedService;
            _generalSettings = generalSettings;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public Task<string> CloneRemoteRepository(string org, string repository)
        {
            try
            {
                return _decoratedService.CloneRemoteRepository(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "CloneRemoteRepository", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<string> CloneRemoteRepository(string org, string repository, string destinationPath, string branchName = "")
        {
            try
            {
                return _decoratedService.CloneRemoteRepository(org, repository, destinationPath, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, "CloneRemoteRepository", org, repository, destinationPath, branchName);
                throw;
            }
        }

        /// <inheritdoc/>
        public void Commit(CommitInfo commitInfo)
        {
            try
            {
                _decoratedService.Commit(commitInfo);
            }
            catch (Exception ex)
            {
                LogError(ex, "Commit", commitInfo.Org, commitInfo.Repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task CommitAndPushChanges(string org, string repository, string branchName, string localPath, string message)
        {
            try
            {
                return _decoratedService.CommitAndPushChanges(org, repository, branchName, localPath, message);
            }
            catch (Exception ex)
            {
                LogError(ex, "CommitAndPushChanges", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<Branch> CreateBranch(string org, string repository, string branchName)
        {
            try
            {
                return _decoratedService.CreateBranch(org, repository, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, "CreateBranch", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<bool> CreatePullRequest(string org, string repository, string target, string source, string title)
        {
            try
            {
                return _decoratedService.CreatePullRequest(org, repository, target, source, title);
            }
            catch (Exception ex)
            {
                LogError(ex, "CreatePullRequest", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task DeleteRepository(string org, string repository)
        {
            try
            {
                return _decoratedService.DeleteRepository(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "DeleteRepository", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task FetchRemoteChanges(string org, string repository)
        {
            try
            {
                await _decoratedService.FetchRemoteChanges(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "FetchRemoteChanges", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Commit GetLatestCommitForCurrentUser(string org, string repository)
        {
            try
            {
                return _decoratedService.GetLatestCommitForCurrentUser(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "GetLatestCommitForCurrentUser", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public List<Commit> Log(string org, string repository)
        {
            try
            {
                return _decoratedService.Log(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "Log", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<RepoStatus> PullRemoteChanges(string org, string repository)
        {
            try
            {
                return _decoratedService.PullRemoteChanges(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "PullRemoteChanges", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<bool> Push(string org, string repository)
        {
            try
            {
                return _decoratedService.Push(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "Push", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task PushChangesForRepository(CommitInfo commitInfo)
        {
            try
            {
                return _decoratedService.PushChangesForRepository(commitInfo);
            }
            catch (Exception ex)
            {
                LogError(ex, "CheckRemoteUpdates", commitInfo.Org, commitInfo.Repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public RepoStatus RepositoryStatus(string org, string repository)
        {
            try
            {
                return _decoratedService.RepositoryStatus(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "RepositoryStatus", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<Dictionary<string, string>> GetChangedContent(string org, string repository)
        {
            try
            {
                return _decoratedService.GetChangedContent(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "GetChangedContent", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public void StageChange(string org, string repository, string fileName)
        {
            try
            {
                _decoratedService.StageChange(org, repository, fileName);
            }
            catch (Exception ex)
            {
                LogError(ex, "StageChange", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public List<RepositoryContent> Status(string org, string repository)
        {
            try
            {
                return _decoratedService.Status(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "Status", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public void StoreAppTokenForUser(string token)
        {
            try
            {
                _decoratedService.StoreAppTokenForUser(token);
            }
            catch (Exception ex)
            {
                LogError(ex, "StoreAppTokenForUser");
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task EnsureCloneExists(string org, string repository)
        {
            try
            {
                await _decoratedService.EnsureCloneExists(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "EnsureCloneExists", org, repository);
                throw;
            }
        }

        public void CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName)
        {
            try
            {
                _decoratedService.CheckoutRepoOnBranch(editingContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, "CheckoutRepoOnCommit", editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        public void CommitToLocalRepo(AltinnRepoEditingContext editingContext, string message)
        {
            try
            {
                _decoratedService.CommitToLocalRepo(editingContext, message);
            }
            catch (Exception ex)
            {
                LogError(ex, "CommitToLocalRepo", editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        public void RebaseOntoDefaultBranch(AltinnRepoEditingContext editingContext)
        {
            try
            {
                _decoratedService.RebaseOntoDefaultBranch(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, "RebaseOntoDefaultBranch", editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        public void DeleteLocalBranchIfExists(AltinnRepoEditingContext editingContext, string branchName)
        {
            try
            {
                _decoratedService.DeleteLocalBranchIfExists(editingContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, "DeleteLocalBranch", editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        public void CreateLocalBranch(AltinnRepoEditingContext editingContext, string branchName, string commitSha = null)
        {
            try
            {
                _decoratedService.CreateLocalBranch(editingContext, branchName, commitSha);
            }
            catch (Exception ex)
            {
                LogError(ex, "CreateLocalBranch", editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        public void MergeBranchIntoHead(AltinnRepoEditingContext editingContext, string featureBranch)
        {
            try
            {
                _decoratedService.MergeBranchIntoHead(editingContext, featureBranch);
            }
            catch (Exception ex)
            {
                LogError(ex, "MergeBranchIntoHead", editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        private void LogError(Exception ex, string method)
        {
            LogError(ex, method, string.Empty, string.Empty);
        }

        private void LogError(Exception ex, string method, string org, string repository)
        {
            LogError(ex, method, org, repository, repository, string.Empty);
        }

        private void LogError(Exception ex, string method, string org, string repository, string destinationPath, string branch)
        {
            var developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

            _logger.LogError(ex, $"Failed executing method {method} for user {developer} in org {org} / repository {repository}. Destination: {destinationPath}. Branch: {branch}.");
        }
    }
}

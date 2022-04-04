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
using Microsoft.Extensions.Options;

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
        public SourceControlLoggingDecorator(ISourceControl decoratedService, IOptions<GeneralSettings> generalSettings, ILogger<SourceControlLoggingDecorator> logger, IHttpContextAccessor httpContextAccessor)
        {
            _decoratedService = decoratedService;
            _generalSettings = generalSettings.Value;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc/>
        public void AbortMerge(string org, string repository)
        {
            try
            {
                _decoratedService.AbortMerge(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "AbortMerge", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public void CheckoutLatestCommitForSpecificFile(string org, string repository, string fileName)
        {
            try
            {
                _decoratedService.CheckoutLatestCommitForSpecificFile(org, repository, fileName);
            }
            catch (Exception ex)
            {
                LogError(ex, "CheckoutLatestCommitForSpecificFile", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public int? CheckRemoteUpdates(string org, string repository)
        {
            try
            {
                return _decoratedService.CheckRemoteUpdates(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "CheckRemoteUpdates", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public string CloneRemoteRepository(string org, string repository)
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
        public string CloneRemoteRepository(string org, string repository, string destinationPath, string branchName = "")
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
        public void CommitAndPushChanges(string org, string repository, string branchName, string localPath, string message)
        {
            try
            {
                _decoratedService.CommitAndPushChanges(org, repository, branchName, localPath, message);
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
        public void FetchRemoteChanges(string org, string repository)
        {
            try
            {
                _decoratedService.FetchRemoteChanges(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "FetchRemoteChanges", org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public string GetAppToken()
        {
            try
            {
                return _decoratedService.GetAppToken();
            }
            catch (Exception ex)
            {
                LogError(ex, "GetAppToken");
                throw;
            }
        }

        /// <inheritdoc/>
        public string GetAppTokenId()
        {
            try
            {
                return _decoratedService.GetAppTokenId();
            }
            catch (Exception ex)
            {
                LogError(ex, "GetAppTokenId");
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<string> GetDeployToken()
        {
            try
            {
                return _decoratedService.GetDeployToken();
            }
            catch (Exception ex)
            {
                LogError(ex, "GetDeployToken");
                throw;
            }
        }

        /// <inheritdoc/>
        public Commit GetInitialCommit(string org, string repository)
        {
            try
            {
                return _decoratedService.GetInitialCommit(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "GetInitialCommit", org, repository);
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
        public bool IsLocalRepo(string org, string repository)
        {
            try
            {
                return _decoratedService.IsLocalRepo(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "IsLocalRepo", org, repository);
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
        public RepoStatus PullRemoteChanges(string org, string repository)
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
        public void PushChangesForRepository(CommitInfo commitInfo)
        {
            try
            {
                _decoratedService.PushChangesForRepository(commitInfo);
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
        public void ResetCommit(string org, string repository)
        {
            try
            {
                _decoratedService.ResetCommit(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "ResetCommit", org, repository);
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
        public void VerifyCloneExists(string org, string repository)
        {
            try
            {
                _decoratedService.VerifyCloneExists(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, "VerifyCloneExists", org, repository);
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
            var user = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            var debugInfo = GetDebugInfo();

            _logger.LogError(
                ex,
                "Failed executing method {method} for user {user} in org {org} / repository {repository}. Destination: {destinationPath}. Branch: {branch}. Debug info: {debugInfo}",
                method,
                user,
                org,
                repository,
                destinationPath,
                branch,
                debugInfo);
        }

        private object GetDebugInfo()
        {
            var designerSessionTimeOut = AuthenticationHelper.GetRemainingSessionTime(_httpContextAccessor.HttpContext, _generalSettings.SessionTimeoutCookieName);
            var developerAppTokenId = AuthenticationHelper.GetDeveloperAppTokenId(_httpContextAccessor.HttpContext);
            var developerAppToken = AuthenticationHelper.GetDeveloperAppToken(_httpContextAccessor.HttpContext);

            var debugInfo = new
            {
                DesignerSessionTimeOutSeconds = designerSessionTimeOut.TotalSeconds,
                DeveloperAppTokenId = developerAppTokenId ?? string.Empty,
                TokenLength = developerAppToken?.Length ?? 0
            };

            return System.Text.Json.JsonSerializer.Serialize(debugInfo);
        }
    }
}

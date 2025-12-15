#nullable disable
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Extensions;
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
                LogError(ex, nameof(CloneRemoteRepository), org, repository);
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
                LogError(ex, nameof(CloneRemoteRepository), org, repository, destinationPath, branchName);
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
                LogError(ex, nameof(Commit), commitInfo.Org, commitInfo.Repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task CommitAndPushChanges(string org, string repository, string branchName, string localPath, string message, string accessToken = "")
        {
            try
            {
                return _decoratedService.CommitAndPushChanges(org, repository, branchName, localPath, message, accessToken);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CommitAndPushChanges), org, repository);
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
                LogError(ex, nameof(CreateBranch), org, repository);
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
                LogError(ex, nameof(CreatePullRequest), org, repository);
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
                LogError(ex, nameof(DeleteRepository), org, repository);
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
                LogError(ex, nameof(FetchRemoteChanges), org, repository);
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
                LogError(ex, nameof(GetLatestCommitForCurrentUser), org, repository);
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
                LogError(ex, nameof(Log), org, repository);
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
                LogError(ex, nameof(PullRemoteChanges), org, repository);
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
                LogError(ex, nameof(Push), org, repository);
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
                LogError(ex, nameof(PushChangesForRepository), commitInfo.Org, commitInfo.Repository);
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
                LogError(ex, nameof(RepositoryStatus), org, repository);
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
                LogError(ex, nameof(GetChangedContent), org, repository);
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
                LogError(ex, nameof(StageChange), org, repository);
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
                LogError(ex, nameof(Status), org, repository);
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
                LogError(ex, nameof(StoreAppTokenForUser));
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task CloneIfNotExists(string org, string repository)
        {
            try
            {
                await _decoratedService.CloneIfNotExists(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CloneIfNotExists), org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public void CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName)
        {
            try
            {
                _decoratedService.CheckoutRepoOnBranch(editingContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CheckoutRepoOnBranch), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public void CommitToLocalRepo(AltinnRepoEditingContext editingContext, string message)
        {
            try
            {
                _decoratedService.CommitToLocalRepo(editingContext, message);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CommitToLocalRepo), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public LibGit2Sharp.RebaseResult RebaseOntoDefaultBranch(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.RebaseOntoDefaultBranch(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(RebaseOntoDefaultBranch), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public void DeleteLocalBranchIfExists(AltinnRepoEditingContext editingContext, string branchName)
        {
            try
            {
                _decoratedService.DeleteLocalBranchIfExists(editingContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(DeleteLocalBranchIfExists), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public void CreateLocalBranch(AltinnRepoEditingContext editingContext, string branchName, string commitSha = null)
        {
            try
            {
                _decoratedService.CreateLocalBranch(editingContext, branchName, commitSha);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CreateLocalBranch), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public void MergeBranchIntoHead(AltinnRepoEditingContext editingContext, string featureBranch)
        {
            try
            {
                _decoratedService.MergeBranchIntoHead(editingContext, featureBranch);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(MergeBranchIntoHead), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        public async Task PublishBranch(AltinnRepoEditingContext editingContext, string branchName)
        {
            try
            {
                await _decoratedService.PublishBranch(editingContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(PublishBranch), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        public async Task DeleteRemoteBranchIfExists(AltinnRepoEditingContext editingContext, string branchName)
        {
            try
            {
                await _decoratedService.DeleteRemoteBranchIfExists(editingContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(DeleteRemoteBranchIfExists), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public CurrentBranchInfo GetCurrentBranch(string org, string repository)
        {
            try
            {
                return _decoratedService.GetCurrentBranch(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(GetCurrentBranch), org, repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<RepoStatus> CheckoutBranchWithValidation(string org, string repository, string branchName)
        {
            try
            {
                return await _decoratedService.CheckoutBranchWithValidation(org, repository, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CheckoutBranchWithValidation), org, repository, repository, branchName);
                throw;
            }
        }

        /// <inheritdoc/>
        public RepoStatus DiscardLocalChanges(string org, string repository)
        {
            try
            {
                return _decoratedService.DiscardLocalChanges(org, repository);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(DiscardLocalChanges), org, repository);
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
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);

            _logger.LogError(
                ex,
                "Failed executing method {Method} for user {Developer} in org {Org} / repository {Repository}. Destination: {DestinationPath}. Branch: {Branch}.",
                method,
                developer,
                org.WithoutLineBreaks(),
                repository.WithoutLineBreaks(),
                destinationPath.WithoutLineBreaks(),
                branch.WithoutLineBreaks());
        }
    }
}

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
        public Task<string> CloneRemoteRepository(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.CloneRemoteRepository(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CloneRemoteRepository), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<string> CloneRemoteRepository(AltinnRepoEditingContext editingContext, string destinationPath, string branchName = "")
        {
            try
            {
                return _decoratedService.CloneRemoteRepository(editingContext, destinationPath, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CloneRemoteRepository), editingContext.Org, editingContext.Repo, destinationPath, branchName);
                throw;
            }
        }

        /// <inheritdoc/>
        public void Commit(CommitInfo commitInfo, AltinnRepoEditingContext editingContext)
        {
            try
            {
                _decoratedService.Commit(commitInfo, editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(Commit), commitInfo.Org, commitInfo.Repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task CommitAndPushChanges(AltinnRepoEditingContext editingContext, string branchName, string localPath, string message, string accessToken = "")
        {
            try
            {
                return _decoratedService.CommitAndPushChanges(editingContext, branchName, localPath, message, accessToken);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CommitAndPushChanges), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<Branch> CreateBranch(AltinnRepoEditingContext editingContext, string branchName)
        {
            try
            {
                return _decoratedService.CreateBranch(editingContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CreateBranch), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<bool> CreatePullRequest(AltinnRepoEditingContext editingContext, string target, string source, string title)
        {
            try
            {
                return _decoratedService.CreatePullRequest(editingContext, target, source, title);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CreatePullRequest), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task DeleteRepository(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.DeleteRepository(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(DeleteRepository), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task FetchRemoteChanges(AltinnRepoEditingContext editingContext)
        {
            try
            {
                await _decoratedService.FetchRemoteChanges(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(FetchRemoteChanges), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public Commit GetLatestCommitForCurrentUser(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.GetLatestCommitForCurrentUser(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(GetLatestCommitForCurrentUser), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public List<Commit> Log(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.Log(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(Log), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<RepoStatus> PullRemoteChanges(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.PullRemoteChanges(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(PullRemoteChanges), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<bool> Push(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.Push(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(Push), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task PushChangesForRepository(CommitInfo commitInfo, AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.PushChangesForRepository(commitInfo, editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(PushChangesForRepository), commitInfo.Org, commitInfo.Repository);
                throw;
            }
        }

        /// <inheritdoc/>
        public RepoStatus RepositoryStatus(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.RepositoryStatus(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(RepositoryStatus), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public Task<Dictionary<string, string>> GetChangedContent(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.GetChangedContent(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(GetChangedContent), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public void StageChange(AltinnRepoEditingContext editingContext, string fileName)
        {
            try
            {
                _decoratedService.StageChange(editingContext, fileName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(StageChange), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public List<RepositoryContent> Status(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.Status(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(Status), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public void StoreAppTokenForUser(string token, string developer)
        {
            try
            {
                _decoratedService.StoreAppTokenForUser(token, developer);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(StoreAppTokenForUser));
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task CloneIfNotExists(AltinnRepoEditingContext editingContext)
        {
            try
            {
                await _decoratedService.CloneIfNotExists(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CloneIfNotExists), editingContext.Org, editingContext.Repo);
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

        /// <inheritdoc/>
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

        /// <inheritdoc/>
        public async Task FetchGitNotes(AltinnRepoEditingContext editingContext)
        {
            try
            {
                await _decoratedService.FetchGitNotes(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(FetchGitNotes), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
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
        public CurrentBranchInfo GetCurrentBranch(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.GetCurrentBranch(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(GetCurrentBranch), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public async Task<RepoStatus> CheckoutBranchWithValidation(AltinnRepoEditingContext editingContext, string branchName)
        {
            try
            {
                return await _decoratedService.CheckoutBranchWithValidation(editingContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CheckoutBranchWithValidation), editingContext.Org, editingContext.Repo, editingContext.Developer, branchName);
                throw;
            }
        }

        /// <inheritdoc/>
        public RepoStatus DiscardLocalChanges(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.DiscardLocalChanges(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(DiscardLocalChanges), editingContext.Org, editingContext.Repo);
                throw;
            }
        }

        public string FindLocalRepoLocation(AltinnRepoEditingContext editingContext)
        {
            try
            {
                return _decoratedService.FindLocalRepoLocation(editingContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(FindLocalRepoLocation), editingContext.Org, editingContext.Repo);
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

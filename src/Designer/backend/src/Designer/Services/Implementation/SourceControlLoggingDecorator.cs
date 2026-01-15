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
        public string CloneRemoteRepository(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            try
            {
                return _decoratedService.CloneRemoteRepository(authenticatedContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CloneRemoteRepository), authenticatedContext.Org, authenticatedContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public string CloneRemoteRepository(AltinnAuthenticatedRepoEditingContext authenticatedContext, string destinationPath, string branchName = "")
        {
            try
            {
                return _decoratedService.CloneRemoteRepository(authenticatedContext, destinationPath, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CloneRemoteRepository), authenticatedContext.Org, authenticatedContext.Repo, destinationPath, branchName);
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
        public void CommitAndPushChanges(AltinnRepoEditingContext editingContext, string branchName, string localPath, string message, string accessToken = "")
        {
            try
            {
                _decoratedService.CommitAndPushChanges(editingContext, branchName, localPath, message, accessToken);
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
        public void FetchRemoteChanges(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            try
            {
                _decoratedService.FetchRemoteChanges(authenticatedContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(FetchRemoteChanges), authenticatedContext.Org, authenticatedContext.Repo);
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
        public RepoStatus PullRemoteChanges(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            try
            {
                return _decoratedService.PullRemoteChanges(authenticatedContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(PullRemoteChanges), authenticatedContext.Org, authenticatedContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public bool Push(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            try
            {
                return _decoratedService.Push(authenticatedContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(Push), authenticatedContext.Org, authenticatedContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public void PushChangesForRepository(CommitInfo commitInfo, AltinnRepoEditingContext editingContext)
        {
            try
            {
                _decoratedService.PushChangesForRepository(commitInfo, editingContext);
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
        public Dictionary<string, string> GetChangedContent(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            try
            {
                return _decoratedService.GetChangedContent(authenticatedContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(GetChangedContent), authenticatedContext.Org, authenticatedContext.Repo);
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
        public void CloneIfNotExists(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            try
            {
                _decoratedService.CloneIfNotExists(authenticatedContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CloneIfNotExists), authenticatedContext.Org, authenticatedContext.Repo);
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
        public void PublishBranch(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName)
        {
            try
            {
                _decoratedService.PublishBranch(authenticatedContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(PublishBranch), authenticatedContext.Org, authenticatedContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public void FetchGitNotes(AltinnAuthenticatedRepoEditingContext authenticatedContext)
        {
            try
            {
                _decoratedService.FetchGitNotes(authenticatedContext);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(FetchGitNotes), authenticatedContext.Org, authenticatedContext.Repo);
                throw;
            }
        }

        /// <inheritdoc/>
        public void DeleteRemoteBranchIfExists(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName)
        {
            try
            {
                _decoratedService.DeleteRemoteBranchIfExists(authenticatedContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(DeleteRemoteBranchIfExists), authenticatedContext.Org, authenticatedContext.Repo);
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
        public RepoStatus CheckoutBranchWithValidation(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName)
        {
            try
            {
                return _decoratedService.CheckoutBranchWithValidation(authenticatedContext, branchName);
            }
            catch (Exception ex)
            {
                LogError(ex, nameof(CheckoutBranchWithValidation), authenticatedContext.Org, authenticatedContext.Repo, authenticatedContext.Developer, branchName);
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

#nullable disable
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using LibGit2Sharp;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface for source control functionality
    /// </summary>
    public interface ISourceControl
    {
        /// <summary>
        /// Clone app repository to local repo
        /// </summary>
        /// <param name="authenticatedEditingContext">The authenticated altinn repo editing context</param>
        /// <returns>The result of the cloning</returns>
        string CloneRemoteRepository(AltinnAuthenticatedRepoEditingContext authenticatedEditingContext);

        /// <summary>
        /// Clone repository to specified destination
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        /// <param name="destinationPath">Path of destination folder</param>
        /// <param name="branchName">The name of the branch to clone</param>
        /// <returns>Path of the cloned repository</returns>
        string CloneRemoteRepository(AltinnAuthenticatedRepoEditingContext authenticatedContext, string destinationPath, string branchName = "");

        /// <summary>
        /// Stores a App token for user
        /// </summary>
        /// <param name="token">The token from GITEA</param>
        /// <param name="developer">The developer username</param>
        void StoreAppTokenForUser(string token, string developer);

        /// <summary>
        /// Returns the local repo location
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <returns>The path to the local repository</returns>
        string FindLocalRepoLocation(AltinnRepoEditingContext editingContext);

        /// <summary>
        /// Add all changes in app repo and push to remote
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        /// <param name="commitInfo">the commit information for the app</param>
        void PushChangesForRepository(AltinnAuthenticatedRepoEditingContext authenticatedContext, CommitInfo commitInfo);

        /// <summary>
        /// Commits all changes in repo and pushes them to the provided branch
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        /// <param name="branchName">The name of the branch to push changes to</param>
        /// <param name="localPath">Path to local clone of repository</param>
        /// <param name="message">Commit message</param>
        void CommitAndPushChanges(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName, string localPath, string message);

        /// <summary>
        /// Pull remote changes
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        /// <returns>The repo status</returns>
        RepoStatus PullRemoteChanges(AltinnAuthenticatedRepoEditingContext authenticatedContext);

        /// <summary>
        /// Pull remote changes
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        void FetchRemoteChanges(AltinnAuthenticatedRepoEditingContext authenticatedContext);

        /// <summary>
        /// List Git status for an app repo
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <returns>List of repositories with status</returns>
        List<RepositoryContent> Status(AltinnRepoEditingContext editingContext);

        /// <summary>
        /// List commits
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <returns>List of commits</returns>
        List<Designer.Models.Commit> Log(AltinnRepoEditingContext editingContext);

        /// <summary>
        /// Gets the latest commit for current user
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <returns>The latest commit</returns>
        Designer.Models.Commit GetLatestCommitForCurrentUser(AltinnRepoEditingContext editingContext);

        /// <summary>
        /// Gives the complete repository status
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <returns>The repostatus</returns>
        RepoStatus RepositoryStatus(AltinnRepoEditingContext editingContext);

        /// <summary>
        /// Gets a dictionary of all filePaths and corresponding contentChanges as git diff string comparing working directory to current branch HEAD
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        /// <returns>A dictionary with the filePath and a string for the git diff</returns>
        Dictionary<string, string> GetChangedContent(AltinnAuthenticatedRepoEditingContext authenticatedContext);

        /// <summary>
        /// Push commits to repository
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        /// <returns>boolean indicatng success</returns>
        bool Push(AltinnAuthenticatedRepoEditingContext authenticatedContext);

        /// <summary>
        /// Commit changes for repository
        /// </summary>
        /// <param name="commitInfo">Information about the commit</param>
        /// <param name="editingContext">The altinn repo editing context</param>
        void Commit(CommitInfo commitInfo, AltinnRepoEditingContext editingContext);

        /// <summary>
        /// Stages a specific file changed in working repository.
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <param name="fileName">the entire file path with filen name</param>
        void StageChange(AltinnRepoEditingContext editingContext, string fileName);

        /// <summary>
        /// Ensures repository is cloned if not, it clones it.
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        void CloneIfNotExists(AltinnAuthenticatedRepoEditingContext authenticatedContext);

        /// <summary>
        /// Creates a new branch in the given repository.
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <param name="branchName">The name of the branch to create</param>
        Task<RepositoryClient.Model.Branch> CreateBranch(AltinnRepoEditingContext editingContext, string branchName);

        /// <summary>
        /// Creates a pull request for merging source into target for the provided repository.
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <param name="target">The name of the base ref</param>
        /// <param name="source">The name of the head ref</param>
        /// <param name="title">The pull request title</param>
        Task<bool> CreatePullRequest(AltinnRepoEditingContext editingContext, string target, string source, string title);

        /// <summary>
        /// Deletes the provided repository. Both local clone and remote repo.
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <returns></returns>
        Task DeleteRepository(AltinnRepoEditingContext editingContext);

        /// <summary>
        /// Checkout the repository on specified branch.
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <param name="branchName">The name of the branch</param>
        void CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName);

        /// <summary>
        /// Make a commit to local repository.
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <param name="message">The commit message</param>
        void CommitToLocalRepo(AltinnRepoEditingContext editingContext, string message);

        /// <summary>
        /// Rebases local branch onto default remote branch.
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        RebaseResult RebaseOntoDefaultBranch(AltinnRepoEditingContext editingContext);

        /// <summary>
        /// Deletes a local branch based on the specified name.
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <param name="branchName">The name of the branch</param>
        void DeleteLocalBranchIfExists(AltinnRepoEditingContext editingContext, string branchName);

        /// <summary>
        /// Creates a local branch based on the specified commit sha if given.
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <param name="branchName">The name of the branch</param>
        /// <param name="commitSha">The commit sha</param>
        void CreateLocalBranch(AltinnRepoEditingContext editingContext, string branchName, string commitSha = null);

        /// <summary>
        /// Merge feature branch into head branch.
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <param name="featureBranch">The name of the feature branch</param>
        void MergeBranchIntoHead(AltinnRepoEditingContext editingContext, string featureBranch);

        /// <summary>
        /// Gets information about the current branch
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <returns>Information about the current branch</returns>
        CurrentBranchInfo GetCurrentBranch(AltinnRepoEditingContext editingContext);

        /// <summary>
        /// Checks out a branch, validating that there are no uncommitted changes first
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        /// <param name="branchName">The name of the branch to checkout</param>
        /// <returns>The updated repository status, or null if there are uncommitted changes</returns>
        /// <exception cref="Exceptions.UncommittedChangesException">Thrown when there are uncommitted changes</exception>
        RepoStatus CheckoutBranchWithValidation(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName);

        /// <summary>
        /// Discards all local changes in the repository (hard reset + clean untracked files)
        /// </summary>
        /// <param name="editingContext">The altinn repo editing context</param>
        /// <returns>The updated repository status</returns>
        RepoStatus DiscardLocalChanges(AltinnRepoEditingContext editingContext);

        /// <summary>
        /// Deletes a remote branch based on the specified name, if it exists.
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        /// <param name="branchName">The name of the branch</param>
        void DeleteRemoteBranchIfExists(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName);

        /// <summary>
        /// Publishes branch to remote.
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        /// <param name="branchName">The name of the branch</param>
        void PublishBranch(AltinnAuthenticatedRepoEditingContext authenticatedContext, string branchName);

        /// <summary>
        /// Fetches git notes.
        /// </summary>
        /// <param name="authenticatedContext">The authenticated altinn repo editing context</param>
        void FetchGitNotes(AltinnAuthenticatedRepoEditingContext authenticatedContext);
    }
}

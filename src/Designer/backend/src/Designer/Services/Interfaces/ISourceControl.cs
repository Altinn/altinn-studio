using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Models;

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
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">Name of the repository</param>
        /// <returns>The result of the cloning</returns>
        Task<string> CloneRemoteRepository(string org, string repository);

        /// <summary>
        /// Clone repository to specified destination
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">Name of the repository</param>
        /// <param name="destinationPath">Path of destination folder</param>
        /// <param name="branchName">The name of the branch to clone</param>
        /// <returns>Path of the cloned repository</returns>
        Task<string> CloneRemoteRepository(string org, string repository, string destinationPath, string branchName = "");

        /// <summary>
        /// Stores a App token for user
        /// </summary>
        /// <param name="token">The token from GITEA</param>
        void StoreAppTokenForUser(string token);

        /// <summary>
        /// Add all changes in app repo and push to remote
        /// </summary>
        /// <param name="commitInfo">the commit information for the app</param>
        Task PushChangesForRepository(CommitInfo commitInfo);

        /// <summary>
        /// Commits all changes in repo and pushe them to the provided branch
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">Name of the repository</param>
        /// <param name="branchName">The name of the branch to push changes to</param>
        /// <param name="localPath">Path to local clone of repository</param>
        /// <param name="message">Commit message</param>
        /// <param name="accessToken">Access token for authentication. If empty, uses session-based authentication. Should only be used for special cases like bot operations - avoid for regular user operations.</param>
        Task CommitAndPushChanges(string org, string repository, string branchName, string localPath, string message, string accessToken = "");

        /// <summary>
        /// Pull remote changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">name of the repository</param>
        /// <returns>The repo status</returns>
        Task<RepoStatus> PullRemoteChanges(string org, string repository);

        /// <summary>
        /// Pull remote changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">name of the repository</param>
        Task FetchRemoteChanges(string org, string repository);

        /// <summary>
        /// List Git status for an app repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>List of repositories with status</returns>
        List<RepositoryContent> Status(string org, string repository);

        /// <summary>
        /// List commits
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>List of commits</returns>
        List<Commit> Log(string org, string repository);

        /// <summary>
        /// Gets the latest commit for current user
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The latest commit</returns>
        Commit GetLatestCommitForCurrentUser(string org, string repository);

        /// <summary>
        /// Gives the complete repository status
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of repository</param>
        /// <returns>The repostatus</returns>
        RepoStatus RepositoryStatus(string org, string repository);

        /// <summary>
        /// Gets a dictionary of all filePaths and corresponding contentChanges as git diff string if file has been added or modified
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of repository</param>
        /// <returns>A dictionary with the filePath and a string for the git diff</returns>
        Task<Dictionary<string, string>> GetChangedContent(string org, string repository);

        /// <summary>
        /// Push commits to repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository.</param>
        /// <returns>boolean indicatng success</returns>
        Task<bool> Push(string org, string repository);

        /// <summary>
        /// Commit changes for repository
        /// </summary>
        /// <param name="commitInfo">Information about the commit</param>
        void Commit(CommitInfo commitInfo);

        /// <summary>
        /// Stages a specific file changed in working repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository.</param>
        /// <param name="fileName">the entire file path with filen name</param>
        void StageChange(string org, string repository, string fileName);

        /// <summary>
        /// Ensures repository is cloned if not, it clones it.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository</param>
        Task CloneIfNotExists(string org, string repository);

        /// <summary>
        /// Creates a new branch in the given repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="branchName">Name of branch</param>
        Task<RepositoryClient.Model.Branch> CreateBranch(string org, string repository, string branchName);

        /// <summary>
        /// Creates a pull request for merging source into target for the provided repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="target">The name of the base ref</param>
        /// <param name="source">The name of the head ref</param>
        /// <param name="title">The pull request title</param>
        Task<bool> CreatePullRequest(string org, string repository, string target, string source, string title);

        /// <summary>
        /// Deletes the provided repository. Both local clone and remote repo.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of repository</param>
        /// <returns></returns>
        Task DeleteRepository(string org, string repository);

        /// <summary>
        /// Checkout the repository on specified commit.
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
        void RebaseOntoDefaultBranch(AltinnRepoEditingContext editingContext);

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
    }
}

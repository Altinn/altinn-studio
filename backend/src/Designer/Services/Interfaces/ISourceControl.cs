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
        string CloneRemoteRepository(string org, string repository);

        /// <summary>
        /// Clone repository to specified destination
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">Name of the repository</param>
        /// <param name="destinationPath">Path of destination folder</param>
        /// <param name="branchName">The name of the branch to clone</param>
        /// <returns>Path of the cloned repository</returns>
        string CloneRemoteRepository(string org, string repository, string destinationPath, string branchName = "");

        /// <summary>
        /// Stores a App token for user
        /// </summary>
        /// <param name="token">The token from GITEA</param>
        void StoreAppTokenForUser(string token);

        /// <summary>
        /// Returns the App token for the repository
        /// </summary>
        /// <returns>The token</returns>
        string GetAppToken();

        /// <summary>
        /// Returns the App token id for the repository
        /// </summary>
        /// <returns>The token id</returns>
        string GetAppTokenId();

        /// <summary>
        /// Returns the deploy token for the repository
        /// </summary>
        /// <returns>The token</returns>
        Task<string> GetDeployToken();

        /// <summary>
        /// Add all changes in app repo and push to remote
        /// </summary>
        /// <param name="commitInfo">the commit information for the app</param>
        void PushChangesForRepository(CommitInfo commitInfo);

        /// <summary>
        /// Commits all changes in repo and pushe them to the provided branch
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">Name of the repository</param>
        /// <param name="branchName">The name of the branch to push changes to</param>
        /// <param name="localPath">Path to local clone of repository</param>
        /// <param name="message">Commit message</param>
        void CommitAndPushChanges(string org, string repository, string branchName, string localPath, string message);

        /// <summary>
        /// Pull remote changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">name of the repository</param>
        /// <returns>The repo status</returns>
        RepoStatus PullRemoteChanges(string org, string repository);

        /// <summary>
        /// Pull remote changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">name of the repository</param>
        void FetchRemoteChanges(string org, string repository);

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
        /// Gets initial commit
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The first commits</returns>
        Commit GetInitialCommit(string org, string repository);

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
        /// Discards all local changes for the logged in user and the local repository is updated with latest remote commit (origin/master)
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository</param>
        void ResetCommit(string org, string repository);

        /// <summary>
        /// Discards local changes to a specific file and the files is updated with latest remote commit (origin/master)
        /// by checking out the specific file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository</param>
        /// <param name="fileName">the name of the file</param>
        void CheckoutLatestCommitForSpecificFile(string org, string repository, string fileName);

        /// <summary>
        /// Stages a specific file changed in working repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository.</param>
        /// <param name="fileName">the entire file path with filen name</param>
        void StageChange(string org, string repository, string fileName);

        /// <summary>
        /// Halts the merge operation and keeps local changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository</param>
        void AbortMerge(string org, string repository);

        /// <summary>
        /// Ensures repository is cloned if not, it clones it.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of the repository</param>
        void VerifyCloneExists(string org, string repository);

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
        public Task DeleteRepository(string org, string repository);
    }
}

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
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
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">Name of the repository</param>
        /// <returns>The result of the cloning</returns>
        string CloneRemoteRepository(string org, string repository);

        /// <summary>
        /// Clone repository to specified destination
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">Name of the repository</param>
        /// <param name="destinationPath">Path of destination folder</param>
        /// <returns>Path of the cloned repository</returns>
        string CloneRemoteRepository(string org, string repository, string destinationPath);

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
        /// Pull remote changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">name of the repository</param>
        /// <returns>The repo status</returns>
        RepoStatus PullRemoteChanges(string org, string repository);

        /// <summary>
        /// Gets the number of commits the local repository is behind the remote
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The number of commits behind</returns>
        int? CheckRemoteUpdates(string org, string repository);

        /// <summary>
        /// Pull remote changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">name of the repository</param>
        void FetchRemoteChanges(string org, string repository);

        /// <summary>
        /// List Git status for an app repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>List of repositories with status</returns>
        List<RepositoryContent> Status(string org, string repository);

        /// <summary>
        /// List commits
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>List of commits</returns>
        List<Commit> Log(string org, string repository);

        /// <summary>
        /// Gets initial commit
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The first commits</returns>
        Commit GetInitialCommit(string org, string repository);

        /// <summary>
        /// Gets the latest commit for current user
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>The latest commit</returns>
        Commit GetLatestCommitForCurrentUser(string org, string repository);

        /// <summary>
        /// Gives the complete repository status
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <returns>The repostatus</returns>
        RepoStatus RepositoryStatus(string org, string repository);

        /// <summary>
        /// Verifies if developer has a local repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the local repo.</param>
        /// <returns>true if it exists</returns>
        bool IsLocalRepo(string org, string repository);

        /// <summary>
        /// Push commits to repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
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
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        void ResetCommit(string org, string repository);

        /// <summary>
        /// Discards local changes to a specific file and the files is updated with latest remote commit (origin/master)
        /// by checking out the specific file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        /// <param name="fileName">the name of the file</param>
        void CheckoutLatestCommitForSpecificFile(string org, string repository, string fileName);

        /// <summary>
        /// Stages a specific file changed in working repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository.</param>
        /// <param name="fileName">the entire file path with filen name</param>
        void StageChange(string org, string repository, string fileName);

        /// <summary>
        /// Halts the merge operation and keeps local changes
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        void AbortMerge(string org, string repository);

        /// <summary>
        /// Ensures repository is cloned if not, it clones it.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of the repository</param>
        void VerifyCloneExists(string org, string repository);
    }
}

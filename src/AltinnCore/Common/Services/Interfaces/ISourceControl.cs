using System;
using System.Collections.Generic;
using System.Text;
using AltinnCore.Common.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for source control functionality
    /// </summary>
    public interface ISourceControl
    {
        /// <summary>
        /// Clone service repository to local repo
        /// </summary>
        /// <param name="org">the organisation</param>
        /// <param name="repository">Name of the repository</param>
        void CloneRemoteRepository(string org, string repository);

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
        /// Add all changes in service repo and push to remote
        /// </summary>
        /// <param name="commitInfo">the commit information for the service</param>
        void PushChangesForRepository(CommitInfo commitInfo);

        /// <summary>
        /// Pull remote changes
        /// </summary>
        /// <param name="org">the organisation</param>
        /// <param name="repository">name of the repository</param>
        void PullRemoteChanges(string org, string repository);

        /// <summary>
        /// Gets the number of commits the local repository is behind the remote
        /// </summary>
        /// <param name="org">The organization owning the repository</param>
        /// <param name="repository">The repository</param>
        /// <returns>The number of commits behind</returns>
        int? CheckRemoteUpdates(string org, string repository);

        /// <summary>
        /// Pull remote changes
        /// </summary>
        /// <param name="org">the organisation</param>
        /// <param name="repository">name of the repository</param>
        void FetchRemoteChanges(string org, string repository);

        /// <summary>
        /// List Git status for a service repo
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="repository">The name of the repository</param>
        /// <returns>List of repositories with status</returns>
        List<RepositoryContent> Status(string org, string repository);

        /// <summary>
        /// Gives the full repository status for 
        /// </summary>
        /// <param name="owner">The owner of the repo, org or user</param>
        /// <param name="repository">The name of repository</param>
        /// <returns>The repostatus</returns>
        RepoStatus RepositoryStatus(string owner, string repository);

        /// <summary>
        /// Verifies if developer has a local repo
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="repository">The name of the local repo</param>
        /// <returns>true if it exists</returns>
        bool IsLocalRepo(string org, string repository);
  }
}

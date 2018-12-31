using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.RepositoryClient.Model;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Gitea wrapper
    /// </summary>
    public interface IGitea
    {
        /// <summary>
        /// Get the current user
        /// </summary>
        /// <param name="giteaSession">the gitea session</param>
        /// <returns>The current user</returns>
        Task<AltinnCore.RepositoryClient.Model.User> GetCurrentUser(string giteaSession);

        /// <summary>
        /// Create repository for th organisation
        /// </summary>
        /// <param name="giteaSession">the gitea session</param>
        /// <param name="org">the organisation</param>
        /// <param name="createRepoOption">the options for creating repository</param>
        /// <returns>The newly created for the repository</returns>
        Task<AltinnCore.RepositoryClient.Model.Repository> CreateRepositoryForOrg(string giteaSession, string org, AltinnCore.RepositoryClient.Model.CreateRepoOption createRepoOption);

        /// <summary>
        /// Search the repository for the given parameters
        /// </summary>
        /// <param name="onlyAdmin">search parameter to search only admin repositories</param>
        /// <param name="keyWord">the search keyword</param>
        /// <param name="page">the page to search</param>
        /// <returns>The repositories matching the search</returns>
        Task<SearchResults> SearchRepository(bool onlyAdmin, string keyWord, int page);

        /// <summary>
        /// Create app token
        /// </summary>
        /// <param name="tokenName">app token name</param>
        /// <param name="userName">The userName of the user that need a token</param>
        /// <param name="password">The password for the user that need a token</param>
        /// <returns>null</returns>
        Task<string> CreateAppToken(string tokenName, string userName, string password);

        /// <summary>
        /// List app tokens for a user. Warning there is talks about removing this.
        /// </summary>
        /// <param name="userName">The user name</param>
        /// <param name="password">The password</param>
        /// <returns>The sha1 value</returns>
        Task<List<AltinnCore.RepositoryClient.Model.AccessToken>> ListAccessTokens(string userName, string password);

        /// <summary>
        /// Returns organization that user has access to
        /// </summary>
        /// <param name="giteaSession">the gitea session</param>
        /// <returns>A list over organizations</returns>
        Task<List<AltinnCore.RepositoryClient.Model.Organization>> GetUserOrganizations(string giteaSession);

        /// <summary>
        /// Returns information about a organization based on name
        /// </summary>
        /// <param name="name">The name of the organization</param>
        /// <returns>The organization</returns>
        Task<Organization> GetOrganization(string name);

        /// <summary>
        /// List all branches with commit for a repo
        /// </summary>
        /// <param name="owner">The owner of the</param>
        /// <param name="repo">The name of the repo</param>
        /// <returns>The repoList</returns>
        Task<List<Branch>> GetBranches(string owner, string repo);

        /// <summary>
        /// Returns information about a given branch
        /// </summary>
        /// <param name="owner">The owner of the repository</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="branch">Name of branch</param>
        /// <returns>The branch info</returns>
        Task<Branch> GetBranch(string owner, string repository, string branch);
    }
}

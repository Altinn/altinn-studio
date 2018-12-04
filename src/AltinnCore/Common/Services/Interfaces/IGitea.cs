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
        /// <param name="name">app token name</param>
        /// <returns>null</returns>
        string CreateAppToken(string name);

        /// <summary>
        /// Returns organization that user has access to
        /// </summary>
        /// <param name="giteaSession">the gitea session</param>
        /// <returns>A list over organizations</returns>
        Task<List<AltinnCore.RepositoryClient.Model.Organization>> GetUserOrganizations(string giteaSession);
  }
}

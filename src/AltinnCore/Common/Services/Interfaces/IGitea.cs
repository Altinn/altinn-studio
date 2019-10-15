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
        /// <returns>The current user</returns>
        Task<AltinnCore.RepositoryClient.Model.User> GetCurrentUser();

        /// <summary>
        /// Create repository for th organisation
        /// </summary>
        /// <param name="owner">the owner</param>
        /// <param name="createRepoOption">the options for creating repository</param>
        /// <returns>The newly created for the repository</returns>
        Task<AltinnCore.RepositoryClient.Model.Repository> CreateRepository(string owner, AltinnCore.RepositoryClient.Model.CreateRepoOption createRepoOption);

        /// <summary>
        /// Search the repository for the given parameters
        /// </summary>
        /// <param name="onlyAdmin">search parameter to search only admin repositories</param>
        /// <param name="keyWord">the search keyword</param>
        /// <param name="page">the page to search</param>
        /// <returns>The repositories matching the search</returns>
        Task<SearchResults> SearchRepository(bool onlyAdmin, string keyWord, int page);

        /// <summary>
        /// Fetch the repository information of a given owner and service
        /// </summary>
        /// <param name="owner">the owner of the repository</param>
        /// <param name="repository">the repository</param>
        /// <returns>Information about the repository of the given owner</returns>
        Task<Repository> GetRepository(string owner, string repository);

        /// <summary>
        /// Returns organization that user has access to
        /// </summary>
        /// <returns>A list over organizations</returns>
        Task<List<AltinnCore.RepositoryClient.Model.Organization>> GetUserOrganizations();

        /// <summary>
        /// This method screen scrapes the user from the profile ui in GITEA.
        /// This was needed when GITEA changed their API policy in 1.5.2 and requiring
        /// only API calls with token. This is currently the only known way to get
        /// info about the logged in user in GITEA. 
        /// </summary>
        /// <returns>Returns the logged in user</returns>
        Task<string> GetUserNameFromUI();

        /// <summary>
        /// This method generates a application key in GITEA with
        /// help of screen scraping the Application form in GITEA
        /// This is the only  way (currently) to generate a APP key without involving the user in 
        /// </summary>
        /// <returns>A newly generated token</returns>
        Task<KeyValuePair<string, string>?> GetSessionAppKey(string keyName = null);
    }
}

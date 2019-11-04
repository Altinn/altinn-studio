using System.Collections.Generic;
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
        Task<User> GetCurrentUser();

        /// <summary>
        /// Create repository for the org.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="createRepoOption">the options for creating repository.</param>
        /// <returns>The newly created repository object.</returns>
        Task<Repository> CreateRepository(string org, CreateRepoOption createRepoOption);

        /// <summary>
        /// Search the repository for the given parameters
        /// </summary>
        /// <param name="onlyAdmin">search parameter to search only admin repositories</param>
        /// <param name="keyWord">the search keyword</param>
        /// <param name="page">the page to search</param>
        /// <returns>The repositories matching the search</returns>
        Task<SearchResults> SearchRepository(bool onlyAdmin, string keyWord, int page);

        /// <summary>
        /// Fetch the repository information of a given org and repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">the repository</param>
        /// <returns>Information about the repository of the given org.</returns>
        Task<Repository> GetRepository(string org, string repository);

        /// <summary>
        /// Returns organisation that user has access to
        /// </summary>
        /// <returns>A list over organisations</returns>
        Task<List<Organization>> GetUserOrganizations();

        /// <summary>
        /// List all branches with commit for a repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">The name of the repo</param>
        /// <returns>The repoList</returns>
        Task<List<Branch>> GetBranches(string org, string repo);

        /// <summary>
        /// Returns information about a given branch
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="branch">Name of branch</param>
        /// <returns>The branch info</returns>
        Task<Branch> GetBranch(string org, string repository, string branch);

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

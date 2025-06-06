using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;

namespace Altinn.Studio.Designer.Services.Interfaces
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
        /// List the repos that the authenticated user owns or has access to
        /// </summary>
        /// <returns>List of repos</returns>
        Task<IList<Altinn.Studio.Designer.RepositoryClient.Model.Repository>> GetUserRepos();

        /// <summary>
        /// List an organization's repos
        /// </summary>
        /// <returns>List of repos</returns>
        Task<IList<RepositoryClient.Model.Repository>> GetOrgRepos(string org);

        /// <summary>
        /// List the repos that the authenticated user has starred
        /// </summary>
        /// <returns>List of repos</returns>
        Task<IList<RepositoryClient.Model.Repository>> GetStarred();

        /// <summary>
        /// Adds a star to the given repository.
        /// </summary>
        /// <param name="org">The organization that owns the repository to star</param>
        /// <param name="repository">The repository to star</param>
        Task<bool> PutStarred(string org, string repository);

        /// <summary>
        /// Deletes the star marking from the given repository.
        /// </summary>
        /// <param name="org">The organization that owns the repository</param>
        /// <param name="repository">The repository to remove the star from</param>
        Task<bool> DeleteStarred(string org, string repository);

        /// <summary>
        /// Create repository for the org.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="options">the options for creating repository.</param>
        /// <returns>The newly created repository object.</returns>
        Task<Altinn.Studio.Designer.RepositoryClient.Model.Repository> CreateRepository(string org, CreateRepoOption options);

        /// <summary>
        /// Search the repository for the given searchOptions
        /// </summary>
        /// <param name="searchOption">the search options</param>
        Task<SearchResults> SearchRepo(SearchOptions searchOption);

        /// <summary>
        /// Fetch the repository information of a given org and repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">the repository</param>
        /// <returns>Information about the repository of the given org.</returns>
        Task<Altinn.Studio.Designer.RepositoryClient.Model.Repository> GetRepository(string org, string repository);

        /// <summary>
        /// Returns organisation that user has access to
        /// </summary>
        /// <returns>A list over organisations</returns>
        Task<List<Organization>> GetUserOrganizations();

        /// <summary>
        /// Returns information about a given branch
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="branch">Name of branch</param>
        /// <returns>The branch info</returns>
        Task<Branch> GetBranch(string org, string repository, string branch);

        /// <summary>
        /// Returns a list of branches in the repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repository">The name of repository</param>
        /// <returns>The list of branches</returns>
        Task<List<Branch>> GetBranches(string org, string repository);

        /// <summary>
        /// Creates a new branch in the given repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="branchName">Name of branch</param>
        /// <returns>Information about the created branch</returns>
        Task<Branch> CreateBranch(string org, string repository, string branchName);

        /// <summary>
        /// Gets a file from a filepath
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">The name of repository</param>
        /// <param name="filePath">Path to a file, may start with full commit sha</param>
        /// <param name="shortCommitId">The short hash of a commit id</param>
        /// <returns></returns>
        Task<FileSystemObject> GetFileAsync(string org, string app, string filePath, string shortCommitId);

        /// <summary>
        /// Takes in a ServiceResource-object and uses it to create a ListviewServiceResource-object that contains some additional fields not stored in the resourceregistry
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="repo">The repository</param>
        /// <param name="serviceResource">The ServiceResource that is to be converted into a ListviewServiceResource</param>
        /// <returns>Returns the ListviewServiceResource based on the information from input and additional fields</returns>
        Task<ListviewServiceResource> MapServiceResourceToListViewResource(string org, string repo, ServiceResource serviceResource);

        /// <summary>
        /// Gets a list of files in a folder from a folder path. Note that the file content is not returned, only metadata.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">The name of repository</param>
        /// <param name="directoryPath">Path to a directort, may start with full commit sha</param>
        /// <param name="shortCommitId">The short hash of a commit id</param>
        /// <returns>a list of files in the given directory</returns>
        Task<List<FileSystemObject>> GetDirectoryAsync(string org, string app, string directoryPath, string shortCommitId);

        /// <summary>
        /// Retuns list of the teams the user is memeber of.
        /// </summary>
        /// <returns></returns>
        Task<List<Team>> GetTeams();

        /// <summary>
        /// Creates a pull request for the repository based on the provided create pull request option.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of repository.</param>
        /// <param name="createPullRequestOption">The createPullRequestOption.</param>
        /// <returns></returns>
        Task<bool> CreatePullRequest(string org, string repository, CreatePullRequestOption createPullRequestOption);

        /// <summary>
        /// Deletes the repository.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of repository.</param>
        Task<bool> DeleteRepository(string org, string repository);
    }
}

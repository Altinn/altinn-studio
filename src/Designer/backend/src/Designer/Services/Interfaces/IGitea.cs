using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
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
        Task<IList<RepositoryClient.Model.Repository>> GetUserRepos();

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
        Task<RepositoryClient.Model.Repository> CreateRepository(string org, CreateRepoOption options);

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
        Task<RepositoryClient.Model.Repository> GetRepository(string org, string repository);

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
        /// Gets a file from a filepath at a specific reference (commit/branch/tag).
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">The name of repository</param>
        /// <param name="filePath">Path to a file, may start with full commit sha</param>
        /// <param name="reference">The short hash of a commit id</param>
        /// <param name="cancellationToken">The cancellation token</param>
        Task<FileSystemObject> GetFileAsync(string org, string app, string filePath, string reference, CancellationToken cancellationToken = default);

        /// <summary>
        /// Takes in a ServiceResource-object and uses it to create a ListviewServiceResource-object that contains some additional fields not stored in the resourceregistry
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="repo">The repository</param>
        /// <param name="serviceResource">The ServiceResource that is to be converted into a ListviewServiceResource</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Returns the ListviewServiceResource based on the information from input and additional fields</returns>
        Task<ListviewServiceResource> MapServiceResourceToListViewResource(string org, string repo, ServiceResource serviceResource, CancellationToken cancellationToken);

        /// <summary>
        /// Gets a list of files in a folder from a folder path. Note that the file content is not returned, only metadata.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">The name of repository</param>
        /// <param name="directoryPath">Path to a directory, may start with full commit sha</param>
        /// <param name="reference">Resource reference, commit/branch/tag, usually default branch if empty.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>a list of files in the given directory</returns>
        Task<List<FileSystemObject>> GetDirectoryAsync(string org, string app, string directoryPath, string reference = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets the files in the CodeLists directory of a given repository.
        /// If the directory is missing, returns an empty list.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of repository</param>
        /// <param name="reference">Resource reference, commit/branch/tag, usually default branch if empty.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>A list of <see cref="FileSystemObject"/>.</returns>
        Task<List<FileSystemObject>> GetCodeListDirectoryContentAsync(string org, string repository, string reference = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// Returns list of the teams the user is member of.
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

        /// <summary>
        /// Modifies multiple files in the given repository. If a file does not exist, it
        /// will be created. If it exists, it will be updated.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the repository.</param>
        /// <param name="repository">The name of repository.</param>
        /// <param name="files">The list of files to modify.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        Task<bool> ModifyMultipleFiles(string org, string repository, GiteaMultipleFilesDto files, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets the latest commit on a given branch.
        /// </summary>
        /// <param name="org">The organization owner of the repository.</param>
        /// <param name="repository">The name of repository.</param>
        /// <param name="branchName">The name of the branch. If null or empty, the default branch (master) will be used.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>The latest commit SHA as a string.</returns>
        Task<string> GetLatestCommitOnBranch(string org, string repository, string branchName = null, CancellationToken cancellationToken = default);
    }
}

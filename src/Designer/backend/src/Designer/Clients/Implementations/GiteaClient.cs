#nullable disable
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Exceptions.Gitea;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Polly;

namespace Altinn.Studio.Designer.Clients.Implementations;

/// <summary>
/// Implementation of the gitea wrapper service.
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="GiteaClient"/> class
/// </remarks>
/// <param name="repositorySettings">the repository settings</param>
/// <param name="httpContextAccessor">the http context accessor</param>
/// <param name="memoryCache">The configured memory cache</param>
/// <param name="logger">The configured logger</param>
/// <param name="httpClient">System.Net.Http.HttpClient</param>
public class GiteaClient(
    ServiceRepositorySettings repositorySettings,
    IHttpContextAccessor httpContextAccessor,
    IMemoryCache memoryCache,
    ILogger<GiteaClient> logger,
    HttpClient httpClient) : IGitea
{
    private const string CodeListFolderName = "CodeLists";

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true,
    };

    /// <inheritdoc/>
    public async Task<User> GetCurrentUser()
    {
        HttpResponseMessage response = await httpClient.GetAsync("user");
        if (response.StatusCode == HttpStatusCode.OK)
        {
            return await response.Content.ReadAsAsync<User>();
        }

        logger.LogError(
            "User " + AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext) +
            " Get current user failed with statuscode " + response.StatusCode);

        return null;
    }

    /// <inheritdoc />
    public async Task<List<Team>> GetTeams()
    {
        List<Team> teams = new();

        string url = "user/teams";
        HttpResponseMessage response = await httpClient.GetAsync(url);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            string jsonString = await response.Content.ReadAsStringAsync();
            teams = JsonSerializer.Deserialize<List<Team>>(jsonString, s_jsonOptions) ?? [];
        }
        else
        {
            logger.LogError("Could not retrieve teams for user " + AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext) + " GetTeams failed with status code " + response.StatusCode);
        }

        return teams;
    }

    /// <inheritdoc />
    public async Task<RepositoryClient.Model.Repository> CreateRepository(string org, CreateRepoOption options)
    {
        var repository = new RepositoryClient.Model.Repository();
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        string urlEnd = developer == org ? "user/repos" : $"org/{org}/repos";
        HttpResponseMessage response = await httpClient.PostAsJsonAsync(urlEnd, options);

        if (response.StatusCode == HttpStatusCode.Created)
        {
            repository = await response.Content.ReadAsAsync<RepositoryClient.Model.Repository>();
            repository.RepositoryCreatedStatus = HttpStatusCode.Created;
        }
        else if (response.StatusCode == HttpStatusCode.Conflict)
        {
            // The repository with the same name already exists, 409 from Gitea API
            repository.RepositoryCreatedStatus = HttpStatusCode.Conflict;
        }
        else if (response.StatusCode == HttpStatusCode.Forbidden)
        {
            // The user is not part of a team with repo-creation permissions, 403 from Gitea API
            logger.LogError($"User {developer} - Create repository failed with statuscode {response.StatusCode} for {org} and repo-name {options.Name}. If this was not expected try updating team settings in gitea.");
            repository.RepositoryCreatedStatus = HttpStatusCode.Forbidden;
        }
        else
        {
            logger.LogError($"User {developer} - Create repository failed with statuscode {response.StatusCode} for {org} and repo-name {options.Name}.");
            repository.RepositoryCreatedStatus = response.StatusCode;
        }

        return repository;
    }

    /// <inheritdoc/>
    public async Task<IList<RepositoryClient.Model.Repository>> GetUserRepos()
    {
        IList<RepositoryClient.Model.Repository> repos = new List<RepositoryClient.Model.Repository>();

        HttpResponseMessage response = await httpClient.GetAsync("user/repos?limit=50");
        if (response.StatusCode == HttpStatusCode.OK)
        {
            repos = await response.Content.ReadAsAsync<IList<RepositoryClient.Model.Repository>>();

            foreach (RepositoryClient.Model.Repository repo in repos)
            {
                if (string.IsNullOrEmpty(repo.Owner?.Login))
                {
                    continue;
                }

                repo.IsClonedToLocal = IsLocalRepo(repo.Owner.Login, repo.Name);
                Organization org = await GetCachedOrg(repo.Owner.Login);
                if (org.Id != -1)
                {
                    repo.Owner.UserType = UserType.Org;
                }
            }
        }

        return repos;
    }

    /// <summary>
    /// Gets all repositores that the user has starred.
    /// </summary>
    /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
    public async Task<IList<RepositoryClient.Model.Repository>> GetStarred()
    {
        var starredRepos = new List<RepositoryClient.Model.Repository>();

        HttpResponseMessage response = await httpClient.GetAsync("user/starred?limit=100");
        if (response.StatusCode == HttpStatusCode.OK)
        {
            var repos = await response.Content.ReadAsAsync<List<RepositoryClient.Model.Repository>>();
            starredRepos.AddRange(repos);
        }

        return starredRepos;
    }

    /// <inheritdoc/>
    public async Task<bool> PutStarred(string org, string repository)
    {
        using HttpRequestMessage request = new(HttpMethod.Put, $"user/starred/{org}/{repository}");
        using HttpResponseMessage response = await httpClient.SendAsync(request);

        return response.StatusCode == HttpStatusCode.NoContent;
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteStarred(string org, string repository)
    {
        using HttpRequestMessage request = new(HttpMethod.Delete, $"user/starred/{org}/{repository}");
        using HttpResponseMessage response = await httpClient.SendAsync(request);

        return response.StatusCode == HttpStatusCode.NoContent;
    }

    /// <inheritdoc/>
    public async Task<IList<RepositoryClient.Model.Repository>> GetOrgRepos(string org)
    {
        IList<RepositoryClient.Model.Repository> repos = new List<RepositoryClient.Model.Repository>();

        HttpResponseMessage response = await httpClient.GetAsync($"orgs/{org}/repos?limit=50");
        if (response.StatusCode == HttpStatusCode.OK)
        {
            repos = await response.Content.ReadAsAsync<IList<RepositoryClient.Model.Repository>>();
        }

        return repos;
    }

    /// <inheritdoc/>
    public async Task<ListviewServiceResource> MapServiceResourceToListViewResource(string org, string repo, ServiceResource serviceResource, CancellationToken cancellationToken)
    {
        ListviewServiceResource listviewResource = new ListviewServiceResource
        {
            Identifier = serviceResource.Identifier,
            Title = serviceResource.Title,
        };

        string resourceFolder = serviceResource.Identifier;

        HttpResponseMessage fileResponse = await httpClient.GetAsync($"repos/{org}/{repo}/commits?path={resourceFolder}&stat=false&verification=false&files=false", cancellationToken);

        if (fileResponse.StatusCode == HttpStatusCode.OK)
        {
            List<GiteaCommit> commitResponse = null;

            try
            {
                commitResponse = await fileResponse.Content.ReadAsAsync<List<GiteaCommit>>(cancellationToken);
            }
            catch (JsonException)
            {
                // Not pushed to git
            }
            catch (Exception)
            {
                // Not pushed to git
            }

            if (commitResponse != null)
            {
                string commitUserName = commitResponse.LastOrDefault().Commit?.Author?.Name;
                string userFullName = await GetCachedUserFullName(commitUserName);
                listviewResource.CreatedBy = userFullName;
                listviewResource.LastChanged = DateTime.Parse(commitResponse.FirstOrDefault().Created);
            }
        }

        return listviewResource;
    }

    /// <inheritdoc/>
    public async Task<SearchResults> SearchRepo(SearchOptions searchOption)
    {
        string giteaSearchUriString = BuildSearchQuery(searchOption);

        SearchResults searchResults = null;
        HttpResponseMessage response = await httpClient.GetAsync(giteaSearchUriString);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            searchResults = await response.Content.ReadAsAsync<SearchResults>();
            if (response.Headers.TryGetValues("X-Total-Count", out IEnumerable<string> countValues))
            {
                searchResults.TotalCount = Convert.ToInt32(countValues.First());
            }

            if (response.Headers.TryGetValues("Link", out IEnumerable<string> linkValues))
            {
                LinkHeader linkHeader = LinkHeader.LinksFromHeader(linkValues.First());
                if (!string.IsNullOrEmpty(linkHeader.LastLink))
                {
                    Uri linkUri = new Uri(linkHeader.LastLink);
                    string page = HttpUtility.ParseQueryString(linkUri.Query).Get("page");
                    if (int.TryParse(page, out int lastPage))
                    {
                        searchResults.TotalPages = lastPage;
                    }
                }
                else
                {
                    searchResults.TotalPages = searchOption.Page;
                }
            }

            if (searchResults.TotalCount > 0 && searchResults.TotalPages == 0)
            {
                searchResults.TotalPages = 1;
            }
        }
        else
        {
            logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext) + " SearchRepository failed with statuscode " + response.StatusCode);
        }

        return searchResults;
    }

    private string BuildSearchQuery(SearchOptions searchOption)
    {
        if (searchOption.Limit < 1)
        {
            searchOption.Limit = repositorySettings.RepoSearchPageCount;
        }

        string giteaSearchUriString = $"repos/search?limit={searchOption.Limit}";

        if (!string.IsNullOrEmpty(searchOption.Keyword))
        {
            giteaSearchUriString += $"&q={searchOption.Keyword}";
        }

        // Search in description. To prevent DataModelsRepoList from displaying repos with '-datamodels' only in the description,
        // we exclude description searches containing this keyword.
        if (searchOption.Keyword != null && !searchOption.Keyword.Contains("-datamodels"))
        {
            giteaSearchUriString += "&includeDesc=true";
        }

        if (searchOption.UId != 0)
        {
            giteaSearchUriString += $"&uid={searchOption.UId}&exclusive=true";
        }

        if (!string.IsNullOrEmpty(searchOption.SortBy) && new[] { "alpha", "created", "updated", "size", "id" }.Contains(searchOption.SortBy, StringComparer.OrdinalIgnoreCase))
        {
            giteaSearchUriString += $"&sort={searchOption.SortBy}";
        }

        if (!string.IsNullOrEmpty(searchOption.Order) && new[] { "asc", "desc" }.Contains(searchOption.Order, StringComparer.OrdinalIgnoreCase))
        {
            giteaSearchUriString += $"&order={searchOption.Order}";
        }

        if (searchOption.Page != 0)
        {
            giteaSearchUriString += $"&page={searchOption.Page}";
        }

        return giteaSearchUriString;
    }

    /// <inheritdoc/>
    public async Task<RepositoryClient.Model.Repository> GetRepository(string org, string repository)
    {
        RepositoryClient.Model.Repository returnRepository = null;

        string giteaUrl = $"repos/{org}/{repository}";
        HttpResponseMessage response = await httpClient.GetAsync(giteaUrl);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            returnRepository = await response.Content.ReadAsAsync<RepositoryClient.Model.Repository>();
        }
        else
        {
            logger.LogWarning($"User {AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext)} fetching app {org}/{repository} failed with responsecode {response.StatusCode}");
        }

        if (!string.IsNullOrEmpty(returnRepository?.Owner?.Login))
        {
            returnRepository.IsClonedToLocal = IsLocalRepo(returnRepository.Owner.Login, returnRepository.Name);

            Organization organisation = await GetCachedOrg(returnRepository.Owner.Login);
            if (organisation.Id != -1)
            {
                returnRepository.Owner.UserType = UserType.Org;
            }
        }

        return returnRepository;
    }

    /// <inheritdoc />
    public async Task<List<Organization>> GetUserOrganizations()
    {
        HttpResponseMessage response = await httpClient.GetAsync("user/orgs");
        if (response.StatusCode == HttpStatusCode.OK)
        {
            return await response.Content.ReadAsAsync<List<Organization>>();
        }

        logger.LogError($"User " + AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext) + " Get Organizations failed with statuscode " + response.StatusCode);

        return null;
    }

    /// <inheritdoc />
    public async Task<Branch> GetBranch(string org, string repository, string branch)
    {
        Guard.AssertValidateOrganization(org);
        Guard.AssertValidAppRepoName(repository);
        Guard.AssertValidRepoBranchName(branch);

        HttpResponseMessage response = await httpClient.GetAsync($"repos/{org}/{repository}/branches/{branch}");
        if (response.StatusCode == HttpStatusCode.OK)
        {
            return await response.Content.ReadAsAsync<Branch>();
        }

        logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext) + " GetBranch response failed with statuscode " + response.StatusCode + " for " + org + " / " + repository + " branch: " + branch);


        return null;
    }

    /// <inheritdoc />
    public async Task<List<Branch>> GetBranches(string org, string repository)
    {
        Guard.AssertValidateOrganization(org);
        Guard.AssertValidAppRepoName(repository);

        HttpResponseMessage response = await httpClient.GetAsync($"repos/{org}/{repository}/branches");
        if (response.StatusCode == HttpStatusCode.OK)
        {
            return await response.Content.ReadAsAsync<List<Branch>>();
        }

        logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext) + " GetBranches response failed with statuscode " + response.StatusCode + " for " + org + " / " + repository);

        return null;
    }

    /// <inheritdoc />
    public async Task<Branch> CreateBranch(string org, string repository, string branchName)
    {
        // In quite a few cases we have experienced that we get a 404 back
        // when doing a POST to this endpoint, hence we do a simple retry
        // with a specified wait time.
        var retryPolicy = Policy.HandleResult<HttpResponseMessage>(response => response.StatusCode != HttpStatusCode.Created)
            .FallbackAsync(ct =>
            {
                logger.LogError($"//GiteaAPIWrapper // CreateBranch occured when creating branch {branchName} for repo {org}/{repository}");
                throw new GiteaApiWrapperException($"Failed to create branch {branchName} in Gitea after 4 retries.");
            })
            .WrapAsync(
                Policy.HandleResult<HttpResponseMessage>(httpResponse => httpResponse.StatusCode == HttpStatusCode.NotFound)
                    .WaitAndRetryAsync(4, retryAttempt => TimeSpan.FromMilliseconds(500 * retryAttempt))
            );


        HttpResponseMessage response = await retryPolicy.ExecuteAsync(() => PostBranch(org, repository, branchName));

        return await response.Content.ReadAsAsync<Branch>();
    }

    private async Task<HttpResponseMessage> PostBranch(string org, string repository, string branchName)
    {
        string content = $"{{\"new_branch_name\":\"{branchName}\"}}";
        using HttpRequestMessage message = new(HttpMethod.Post, $"repos/{org}/{repository}/branches");
        message.Content = new StringContent(content, Encoding.UTF8, "application/json");

        return await httpClient.SendAsync(message);
    }

    /// <inheritdoc />
    public async Task<FileSystemObject> GetFileAsync(string org, string app, string filePath, string reference, CancellationToken cancellationToken = default)
    {
        string path = $"repos/{org}/{app}/contents/{filePath}";
        string url = AddRefIfExists(path, reference);
        using HttpResponseMessage response = await httpClient.GetAsync(url, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return await response.Content.ReadFromJsonAsync<FileSystemObject>(s_jsonOptions, cancellationToken);
        }

        return null;
    }

    /// <inheritdoc/>
    public async Task<List<FileSystemObject>> GetDirectoryAsync(string org, string app, string directoryPath, string reference = null, CancellationToken cancellationToken = default)
    {
        string path = $"repos/{org}/{app}/contents/{directoryPath}";
        string url = AddRefIfExists(path, reference);

        using HttpResponseMessage response = await httpClient.GetAsync(url, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return await response.Content.ReadFromJsonAsync<List<FileSystemObject>>(s_jsonOptions, cancellationToken);
        }

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            string suffix = string.IsNullOrWhiteSpace(reference) ? string.Empty : $" at reference {reference}";
            DirectoryNotFoundException ex = new($"Directory {directoryPath} not found in repository {org}/{app}{suffix}");
            logger.LogWarning(ex, "Directory not found for org {Org} in repository {App}, at directory path {DirPath} and reference {Ref}", org, app, directoryPath, reference);
            throw ex;
        }

        return [];
    }

    /// <inheritdoc/>
    public async Task<List<FileSystemObject>> GetCodeListDirectoryContentAsync(string org, string repository, string reference = null, CancellationToken cancellationToken = default)
    {
        List<FileSystemObject> directoryContent;
        try
        {
            directoryContent = await GetDirectoryAsync(org, repository, CodeListFolderName, reference, cancellationToken);
        }
        catch (DirectoryNotFoundException)
        {
            return [];
        }

        ConcurrentBag<FileSystemObject> fileBag = [];
        IEnumerable<string> directoryFileNames = directoryContent
            .Where(f => string.Equals(f.Type, "file", StringComparison.OrdinalIgnoreCase))
            .Select(f => f.Name);

        ParallelOptions options = new() { MaxDegreeOfParallelism = 25, CancellationToken = cancellationToken };
        await Parallel.ForEachAsync(directoryFileNames, options,
            async (string fileName, CancellationToken token) =>
            {
                string filePath = $"{CodeListFolderName}/{fileName}";
                FileSystemObject file = await GetFileAsync(org, repository, filePath, reference, token);
                fileBag.Add(file);
            }
        );

        return fileBag.ToList();
    }

    /// <inheritdoc />
    public async Task<(FileSystemObject, ProblemDetails)> GetFileAndErrorAsync(string org, string app, string filePath, string reference, CancellationToken cancellationToken = default)
    {
        string path = $"repos/{org}/{app}/contents/{filePath}";
        string url = AddRefIfExists(path, reference);
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        using HttpResponseMessage response = await httpClient.GetAsync(url, cancellationToken);
        switch (response.StatusCode)
        {
            case HttpStatusCode.OK:
                FileSystemObject fileSystemObject = await response.Content.ReadFromJsonAsync<FileSystemObject>(s_jsonOptions, cancellationToken);
                if (fileSystemObject is null)
                {
                    logger.LogError("User {Developer} GetFileAsync received null content in 200 OK response for {Org}/{App} at path: {FilePath}, ref: {Reference}", developer, org, app, filePath, reference);
                    ProblemDetails unexpectedNullProblem = new()
                    {
                        Status = StatusCodes.Status500InternalServerError,
                        Title = "Unexpected response format",
                        Detail = "The file service returned an invalid response."
                    };
                    return (null, unexpectedNullProblem);
                }
                return (fileSystemObject, null);
            case HttpStatusCode.NotFound:
                ProblemDetails notFoundProblem = new()
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "File not found",
                    Detail = $"A file was not found."
                };
                return (null, notFoundProblem);
            case HttpStatusCode.Unauthorized:
                logger.LogError("User {Developer} GetFileAsync response failed with statuscode {StatusCode} for {Org}/{App} at path: {FilePath}, ref: {Reference}", developer, response.StatusCode, org, app, filePath, reference);
                ProblemDetails hideUnauthorizedWithNotFoundProblem = new()
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = "File not found",
                    Detail = $"A file was not found."
                };
                return (null, hideUnauthorizedWithNotFoundProblem);
            default:
                logger.LogError("User {Developer} GetFileAsync response failed with statuscode {StatusCode} for {Org}/{App} at path: {FilePath}, ref: {Reference}", developer, response.StatusCode, org, app, filePath, reference);
                ProblemDetails generalProblem = new()
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error retrieving file",
                    Detail = "An error occurred when trying to retrieve the file."
                };
                return (null, generalProblem);
        }
    }

    /// <inheritdoc/>
    public async Task<bool> CreatePullRequest(string org, string repository, CreatePullRequestOption createPullRequestOption)
    {
        string content = JsonSerializer.Serialize(createPullRequestOption);
        using HttpResponseMessage response = await httpClient.PostAsync($"repos/{org}/{repository}/pulls", new StringContent(content, Encoding.UTF8, "application/json"));

        return response.IsSuccessStatusCode;
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteRepository(string org, string repository)
    {
        HttpResponseMessage response = await httpClient.DeleteAsync($"repos/{org}/{repository}");
        return response.IsSuccessStatusCode;
    }

    /// <inheritdoc/>
    public async Task<string> GetLatestCommitOnBranch(string org, string repository, string branchName = null, CancellationToken cancellationToken = default)
    {
        var url = new StringBuilder($"repos/{org}/{repository}/commits?limit=1&stat=false&verification=false&files=false");
        if (!string.IsNullOrWhiteSpace(branchName))
        {
            url.Append($"&sha={HttpUtility.UrlEncode(branchName)}");
        }
        using HttpResponseMessage response = await httpClient.GetAsync(url.ToString(), cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            List<GiteaCommit> commits = await response.Content.ReadFromJsonAsync<List<GiteaCommit>>(s_jsonOptions, cancellationToken);
            return commits?.FirstOrDefault()?.Sha;
        }

        logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext) + " GetLatestCommitOnBranch response failed with statuscode " + response.StatusCode + " for " + org + " / " + repository + " branch: " + branchName);
        return null;
    }

    private async Task<Organization> GetOrganization(string name)
    {
        HttpResponseMessage response = await httpClient.GetAsync($"orgs/{name}");
        if (response.StatusCode == HttpStatusCode.OK)
        {
            return await response.Content.ReadAsAsync<Organization>();
        }

        logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext) + " GetOrganization failed with statuscode " + response.StatusCode + "for " + name);

        return null;
    }

    private bool IsLocalRepo(string org, string app)
    {
        string localAppRepoFolder = repositorySettings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext));
        if (Directory.Exists(localAppRepoFolder))
        {
            try
            {
                using (LibGit2Sharp.Repository repo = new(localAppRepoFolder))
                {
                    return true;
                }
            }
            catch (Exception)
            {
                return false;
            }
        }

        return false;
    }

    private async Task<string> GetCachedUserFullName(string username)
    {
        string cacheKey = $"giteauser_fullname:{username}";
        var cacheEntryOptions = new MemoryCacheEntryOptions();
        if (!memoryCache.TryGetValue(cacheKey, out string giteaUserFullName))
        {
            HttpResponseMessage response = await httpClient.GetAsync($"users/{username}/");
            GiteaUser giteaUser = await response.Content.ReadAsAsync<GiteaUser>();
            giteaUserFullName = string.IsNullOrEmpty(giteaUser.FullName) ? username : giteaUser.FullName;
            memoryCache.Set(cacheKey, giteaUserFullName, cacheEntryOptions);
        }

        return giteaUserFullName;
    }

    private async Task<Organization> GetCachedOrg(string org)
    {
        Organization organisation = null;
        string cachekey = "org_" + org;

        if (!memoryCache.TryGetValue(cachekey, out organisation))
        {
            try
            {
                organisation = await GetOrganization(org);
            }
            catch
            {
                organisation = new Organization
                {
                    Id = -1
                };
            }

            // Null value is not cached. so set id property to -1
            if (organisation == null)
            {
                organisation = new Organization
                {
                    Id = -1
                };
            }

            // Keep in cache for this time, reset time if accessed.
            var cacheEntryOptions = new MemoryCacheEntryOptions()
            .SetSlidingExpiration(TimeSpan.FromSeconds(3600));

            // Save data in cache.
            memoryCache.Set(cachekey, organisation, cacheEntryOptions);
        }

        return organisation;
    }

    private static string AddRefIfExists(string path, string reference)
    {
        if (string.IsNullOrWhiteSpace(reference))
        {
            return path;
        }
        return $"{path}?ref={Uri.EscapeDataString(reference)}";
    }
}


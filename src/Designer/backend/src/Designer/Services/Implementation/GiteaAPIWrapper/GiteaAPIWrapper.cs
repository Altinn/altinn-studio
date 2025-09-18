using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Polly;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// Implementation of the gitea wrapper service.
    /// </summary>
    public class GiteaAPIWrapper : IGitea
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IMemoryCache _cache;
        private readonly ILogger _logger;
        private readonly HttpClient _httpClient;
        private const string CodeListFolderPath = "/CodeLists";

        /// <summary>
        /// Initializes a new instance of the <see cref="GiteaAPIWrapper"/> class
        /// </summary>
        /// <param name="repositorySettings">the repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="memoryCache">The configured memory cache</param>
        /// <param name="logger">The configured logger</param>
        /// <param name="httpClient">System.Net.Http.HttpClient</param>
        public GiteaAPIWrapper(
            ServiceRepositorySettings repositorySettings,
            IHttpContextAccessor httpContextAccessor,
            IMemoryCache memoryCache,
            ILogger<GiteaAPIWrapper> logger,
            HttpClient httpClient)
        {
            _settings = repositorySettings;
            _httpContextAccessor = httpContextAccessor;
            _cache = memoryCache;
            _logger = logger;
            _httpClient = httpClient;
        }

        /// <inheritdoc/>
        public async Task<User> GetCurrentUser()
        {
            HttpResponseMessage response = await _httpClient.GetAsync("user");
            if (response.StatusCode == HttpStatusCode.OK)
            {
                return await response.Content.ReadAsAsync<User>();
            }

            _logger.LogError(
                "User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) +
                " Get current user failed with statuscode " + response.StatusCode);

            return null;
        }

        /// <inheritdoc />
        public async Task<List<Team>> GetTeams()
        {
            List<Team> teams = new();

            string url = "user/teams";
            HttpResponseMessage response = await _httpClient.GetAsync(url);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                string jsonString = await response.Content.ReadAsStringAsync();
                var deserializeOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                };

                teams = JsonSerializer.Deserialize<List<Team>>(jsonString, deserializeOptions) ?? new List<Team>();
            }
            else
            {
                _logger.LogError("Could not retrieve teams for user " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetTeams failed with status code " + response.StatusCode);
            }

            return teams;
        }

        /// <inheritdoc />
        public async Task<RepositoryClient.Model.Repository> CreateRepository(string org, CreateRepoOption options)
        {
            var repository = new RepositoryClient.Model.Repository();
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string urlEnd = developer == org ? "user/repos" : $"org/{org}/repos";
            HttpResponseMessage response = await _httpClient.PostAsJsonAsync(urlEnd, options);

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
                _logger.LogError($"User {developer} - Create repository failed with statuscode {response.StatusCode} for {org} and repo-name {options.Name}. If this was not expected try updating team settings in gitea.");
                repository.RepositoryCreatedStatus = HttpStatusCode.Forbidden;
            }
            else
            {
                _logger.LogError($"User {developer} - Create repository failed with statuscode {response.StatusCode} for {org} and repo-name {options.Name}.");
                repository.RepositoryCreatedStatus = response.StatusCode;
            }

            return repository;
        }

        /// <inheritdoc/>
        public async Task<IList<RepositoryClient.Model.Repository>> GetUserRepos()
        {
            IList<RepositoryClient.Model.Repository> repos = new List<RepositoryClient.Model.Repository>();

            HttpResponseMessage response = await _httpClient.GetAsync("user/repos?limit=50");
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

            HttpResponseMessage response = await _httpClient.GetAsync("user/starred?limit=100");
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
            using HttpResponseMessage response = await _httpClient.SendAsync(request);

            return response.StatusCode == HttpStatusCode.NoContent;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteStarred(string org, string repository)
        {
            using HttpRequestMessage request = new(HttpMethod.Delete, $"user/starred/{org}/{repository}");
            using HttpResponseMessage response = await _httpClient.SendAsync(request);

            return response.StatusCode == HttpStatusCode.NoContent;
        }

        /// <inheritdoc/>
        public async Task<IList<RepositoryClient.Model.Repository>> GetOrgRepos(string org)
        {
            IList<RepositoryClient.Model.Repository> repos = new List<RepositoryClient.Model.Repository>();

            HttpResponseMessage response = await _httpClient.GetAsync($"orgs/{org}/repos?limit=50");
            if (response.StatusCode == HttpStatusCode.OK)
            {
                repos = await response.Content.ReadAsAsync<IList<RepositoryClient.Model.Repository>>();
            }

            return repos;
        }

        /// <inheritdoc/>
        public async Task<ListviewServiceResource> MapServiceResourceToListViewResource(string org, string repo, ServiceResource serviceResource)
        {
            ListviewServiceResource listviewResource = new ListviewServiceResource
            {
                Identifier = serviceResource.Identifier,
                Title = serviceResource.Title,
            };

            string resourceFolder = serviceResource.Identifier;

            HttpResponseMessage fileResponse = await _httpClient.GetAsync($"repos/{org}/{repo}/commits?path={resourceFolder}&stat=false&verification=false&files=false");

            if (fileResponse.StatusCode == HttpStatusCode.OK)
            {
                List<GiteaCommit> commitResponse = null;

                try
                {
                    commitResponse = await fileResponse.Content.ReadAsAsync<List<GiteaCommit>>();
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
            HttpResponseMessage response = await _httpClient.GetAsync(giteaSearchUriString);
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
                _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " SearchRepository failed with statuscode " + response.StatusCode);
            }

            return searchResults;
        }

        private string BuildSearchQuery(SearchOptions searchOption)
        {
            if (searchOption.Limit < 1)
            {
                searchOption.Limit = _settings.RepoSearchPageCount;
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
            HttpResponseMessage response = await _httpClient.GetAsync(giteaUrl);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                returnRepository = await response.Content.ReadAsAsync<RepositoryClient.Model.Repository>();
            }
            else
            {
                _logger.LogWarning($"User {AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)} fetching app {org}/{repository} failed with responsecode {response.StatusCode}");
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
            HttpResponseMessage response = await _httpClient.GetAsync("user/orgs");
            if (response.StatusCode == HttpStatusCode.OK)
            {
                return await response.Content.ReadAsAsync<List<Organization>>();
            }

            _logger.LogError($"User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " Get Organizations failed with statuscode " + response.StatusCode);

            return null;
        }

        /// <inheritdoc />
        public async Task<Branch> GetBranch(string org, string repository, string branch)
        {
            Guard.AssertValidateOrganization(org);
            Guard.AssertValidAppRepoName(repository);
            Guard.AssertValidRepoBranchName(branch);

            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{repository}/branches/{branch}");
            if (response.StatusCode == HttpStatusCode.OK)
            {
                return await response.Content.ReadAsAsync<Branch>();
            }

            _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetBranch response failed with statuscode " + response.StatusCode + " for " + org + " / " + repository + " branch: " + branch);


            return null;
        }

        /// <inheritdoc />
        public async Task<List<Branch>> GetBranches(string org, string repository)
        {
            Guard.AssertValidateOrganization(org);
            Guard.AssertValidAppRepoName(repository);

            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{repository}/branches");
            if (response.StatusCode == HttpStatusCode.OK)
            {
                return await response.Content.ReadAsAsync<List<Branch>>();
            }

            _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetBranches response failed with statuscode " + response.StatusCode + " for " + org + " / " + repository);

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
                    _logger.LogError($"//GiteaAPIWrapper // CreateBranch occured when creating branch {branchName} for repo {org}/{repository}");
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

            return await _httpClient.SendAsync(message);
        }

        /// <inheritdoc />
        public async Task<FileSystemObject> GetFileAsync(string org, string app, string filePath, string shortCommitId)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{app}/contents/{filePath}?ref={shortCommitId}");
            return await response.Content.ReadAsAsync<FileSystemObject>();
        }

        public async Task<FileSystemObject> GetFileAsync(string org, string app, string filePath, string shortCommitId, CancellationToken cancellationToken)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{app}/contents/{filePath}?ref={shortCommitId}", cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsAsync<FileSystemObject>(cancellationToken);
            }

            return null;
        }

        /// <inheritdoc/>
        public async Task<List<FileSystemObject>> GetDirectoryAsync(string org, string app, string directoryPath, string reference = "", CancellationToken cancellationToken = default)
        {
            using HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{app}/contents/{directoryPath}?ref={reference}", cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsAsync<List<FileSystemObject>>(cancellationToken);
            }
            // TODO: Should we be this graceful?

            return [];
        }

        /// <inheritdoc/>
        public async Task<List<FileSystemObject>> GetCodeListDirectoryContentAsync(string org, string repository, string reference = "", CancellationToken cancellationToken = default)
        {
            List<FileSystemObject> directoryFiles = await GetDirectoryAsync(org, repository, CodeListFolderPath, reference, cancellationToken);
            List<Task<FileSystemObject>> tasks = [];

            foreach (FileSystemObject directoryFile in directoryFiles)
            {
                string filePath = $"{CodeListFolderPath}/{directoryFile.Name}";
                var task = GetFileAsync(org, repository, filePath, reference, cancellationToken);
                tasks.Add(task);
            }
            FileSystemObject[] files = await Task.WhenAll(tasks);
            return [.. files.Where(file => file is not null)];
        }

        /// <inheritdoc/>
        public async Task<bool> ModifyMultipleFiles(string org, string repository, GiteaMultipleFilesDto files, CancellationToken cancellationToken = default)
        {
            string content = JsonSerializer.Serialize(files);
            using HttpResponseMessage response = await _httpClient.PostAsync($"repos/{org}/{repository}/contents", new StringContent(content, Encoding.UTF8, MediaTypeNames.Application.Json), cancellationToken);
            return response.IsSuccessStatusCode;
        }

        /// <inheritdoc/>
        public async Task<bool> CreatePullRequest(string org, string repository, CreatePullRequestOption createPullRequestOption)
        {
            string content = JsonSerializer.Serialize(createPullRequestOption);
            using HttpResponseMessage response = await _httpClient.PostAsync($"repos/{org}/{repository}/pulls", new StringContent(content, Encoding.UTF8, "application/json"));

            return response.IsSuccessStatusCode;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteRepository(string org, string repository)
        {
            HttpResponseMessage response = await _httpClient.DeleteAsync($"repos/{org}/{repository}");
            return response.IsSuccessStatusCode;
        }

        private async Task<Organization> GetOrganization(string name)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"orgs/{name}");
            if (response.StatusCode == HttpStatusCode.OK)
            {
                return await response.Content.ReadAsAsync<Organization>();
            }

            _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetOrganization failed with statuscode " + response.StatusCode + "for " + name);

            return null;
        }

        private bool IsLocalRepo(string org, string app)
        {
            string localAppRepoFolder = _settings.GetServicePath(org, app, AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext));
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
            if (!_cache.TryGetValue(cacheKey, out string giteaUserFullName))
            {
                HttpResponseMessage response = await _httpClient.GetAsync($"users/{username}/");
                GiteaUser giteaUser = await response.Content.ReadAsAsync<GiteaUser>();
                giteaUserFullName = string.IsNullOrEmpty(giteaUser.FullName) ? username : giteaUser.FullName;
                _cache.Set(cacheKey, giteaUserFullName, cacheEntryOptions);
            }

            return giteaUserFullName;
        }

        private async Task<Organization> GetCachedOrg(string org)
        {
            Organization organisation = null;
            string cachekey = "org_" + org;

            if (!_cache.TryGetValue(cachekey, out organisation))
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
                _cache.Set(cachekey, organisation, cacheEntryOptions);
            }

            return organisation;
        }
    }
}

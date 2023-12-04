using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
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
                teams = await response.Content.ReadAsAsync<List<Team>>() ?? new List<Team>();
            }
            else
            {
                _logger.LogError("Cold not retrieve teams for user " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetTeams failed with statuscode " + response.StatusCode);
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

            HttpResponseMessage response = await _httpClient.GetAsync("user/starred");
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
            HttpRequestMessage request = new(HttpMethod.Put, $"user/starred/{org}/{repository}");
            HttpResponseMessage response = await _httpClient.SendAsync(request);

            return response.StatusCode == HttpStatusCode.NoContent;
        }

        /// <inheritdoc/>
        public async Task<bool> DeleteStarred(string org, string repository)
        {
            HttpRequestMessage request = new(HttpMethod.Delete, $"user/starred/{org}/{repository}");
            HttpResponseMessage response = await _httpClient.SendAsync(request);

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
            ListviewServiceResource listviewResource = new ListviewServiceResource { Identifier = serviceResource.Identifier, Title = serviceResource.Title };
            string resourceFolder = serviceResource.Identifier;

            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{repo}/contents/{resourceFolder}/{serviceResource.Identifier}_resource.json");

            if (response.StatusCode == HttpStatusCode.OK)
            {
                string content = await response.Content.ReadAsStringAsync();

                ContentsResponse contentsResponse = null;

                try
                {
                    contentsResponse = System.Text.Json.JsonSerializer.Deserialize<ContentsResponse>(content);
                }
                catch (JsonException)
                {
                    // Not pushed to git
                }
                catch (Exception)
                {
                    // Not pushed to git
                }

                if (contentsResponse != null)
                {
                    response = await _httpClient.GetAsync($"repos/{org}/{repo}/git/commits/{contentsResponse.LastCommitSha}");
                    if (response.StatusCode == HttpStatusCode.OK)
                    {
                        GiteaCommit lastCommit = await response.Content.ReadAsAsync<GiteaCommit>();
                        listviewResource.LastChanged = DateTime.Parse(lastCommit.Created);
                    }

                    HttpResponseMessage responseFromCommits = await _httpClient.GetAsync($"repos/{org}/{repo}/commits");
                    if (responseFromCommits.StatusCode == HttpStatusCode.OK)
                    {
                        List<GiteaCommit> commitList = await responseFromCommits.Content.ReadAsAsync<List<GiteaCommit>>();
                        DateTime oldestCommitTimestamp = listviewResource.LastChanged;
                        GiteaCommit oldestCommit = new GiteaCommit();
                        foreach (GiteaCommit commit in commitList)
                        {
                            if (DateTime.Parse(commit.Created) <= oldestCommitTimestamp)
                            {
                                oldestCommitTimestamp = DateTime.Parse(commit.Created);
                                oldestCommit = commit;
                            }
                        }

                        if (oldestCommit?.Commit?.Author?.Name != null)
                        {
                            listviewResource.CreatedBy = oldestCommit.Commit.Author.Name;
                        }
                    }
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
        public async Task<List<Branch>> GetBranches(string org, string repo)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{repo}/branches");
            if (response.StatusCode == HttpStatusCode.OK)
            {
                return await response.Content.ReadAsAsync<List<Branch>>();
            }

            _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetBranches response failed with statuscode " + response.StatusCode + " for " + org + " " + repo);

            return new List<Branch>();
        }

        /// <inheritdoc />
        public async Task<Branch> GetBranch(string org, string repository, string branch)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{repository}/branches/{branch}");
            if (response.StatusCode == HttpStatusCode.OK)
            {
                return await response.Content.ReadAsAsync<Branch>();
            }

            _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetBranch response failed with statuscode " + response.StatusCode + " for " + org + " / " + repository + " branch: " + branch);

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
            HttpRequestMessage message = new(HttpMethod.Post, $"repos/{org}/{repository}/branches");
            message.Content = new StringContent(content, Encoding.UTF8, "application/json");

            return await _httpClient.SendAsync(message);
        }

        /// <inheritdoc />
        public async Task<string> GetUserNameFromUI()
        {
            Uri giteaUrl = BuildGiteaUrl("/user/settings/");
            using (HttpClient client = GetWebHtmlClient(false))
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    string htmlContent = await response.Content.ReadAsStringAsync();

                    return GetStringFromHtmlContent(htmlContent, "<input id=\"username\" name=\"name\" value=\"", "\"");
                }
            }

            return null;
        }

        /// <inheritdoc />
        public async Task<KeyValuePair<string, string>?> GetSessionAppKey(string keyName = null)
        {
            string csrf = await GetCsrf();
            await DeleteCurrentAppKeys(csrf, keyName);

            Uri giteaUrl = BuildGiteaUrl("/user/settings/applications");

            Cookie flashTokenCookie = await GenerateTokenAndGetAuthorizedTokenCookie(csrf, giteaUrl, keyName);
            if (flashTokenCookie is null)
            {
                return null;
            }

            using HttpClient clientWithToken = GetWebHtmlClient(false, flashTokenCookie);
            // reading the API key value
            HttpResponseMessage tokenResponse = await clientWithToken.GetAsync(giteaUrl);
            string htmlContent = await tokenResponse.Content.ReadAsStringAsync();
            string token = ExtractTokenFromHtmlContent(htmlContent);
            List<string> keys = FindAllAppKeysId(htmlContent, keyName);

            KeyValuePair<string, string> keyValuePair = new(keys.FirstOrDefault() ?? "1", token);

            return keyValuePair;

        }

        private async Task<Cookie> GenerateTokenAndGetAuthorizedTokenCookie(string csrf, Uri giteaUrl, string tokenKeyName)
        {
            using HttpClient client = GetWebHtmlClient(false);
            // creating new API key
            FormUrlEncodedContent content = GenerateScopesContent(tokenKeyName, csrf);
            HttpResponseMessage response = await client.PostAsync(giteaUrl, content);

            if (response.StatusCode != HttpStatusCode.Redirect && response.StatusCode != HttpStatusCode.SeeOther)
            {
                content = GenerateScopesContent(tokenKeyName, csrf, true);
                response = await client.PostAsync(giteaUrl, content);
            }

            if (response.StatusCode != HttpStatusCode.Redirect && response.StatusCode != HttpStatusCode.SeeOther)
            {
                return null;
            }

            return StealFlashCookie(response);
        }

        private static FormUrlEncodedContent GenerateScopesContent(string keyName, string csrf, bool isVersion20Plus = false)
        {

            List<KeyValuePair<string, string>> formValues = new();
            formValues.Add(new KeyValuePair<string, string>("_csrf", csrf));
            formValues.Add(new KeyValuePair<string, string>("name", keyName == null ? "AltinnStudioAppKey" : keyName));

            if (isVersion20Plus)
            {
                formValues.Add(new KeyValuePair<string, string>("scope", "write:activitypub"));
                formValues.Add(new KeyValuePair<string, string>("scope", "write:admin"));
                formValues.Add(new KeyValuePair<string, string>("scope", "write:issue"));
                formValues.Add(new KeyValuePair<string, string>("scope", "write:misc"));
                formValues.Add(new KeyValuePair<string, string>("scope", "write:notification"));
                formValues.Add(new KeyValuePair<string, string>("scope", "write:organization"));
                formValues.Add(new KeyValuePair<string, string>("scope", "write:package"));
                formValues.Add(new KeyValuePair<string, string>("scope", "write:repository"));
                formValues.Add(new KeyValuePair<string, string>("scope", "write:user"));
            }
            else
            {
                formValues.Add(new KeyValuePair<string, string>("scope", "repo"));
                formValues.Add(new KeyValuePair<string, string>("scope", "admin:org"));
                formValues.Add(new KeyValuePair<string, string>("scope", "admin:public_key"));
                formValues.Add(new KeyValuePair<string, string>("scope", "user"));
                formValues.Add(new KeyValuePair<string, string>("scope", "delete_repo"));
            }
            FormUrlEncodedContent content = new(formValues);
            return content;
        }

        private string ExtractTokenFromHtmlContent(string htmlContent)
        {

            string token = GetStringFromHtmlContent(htmlContent, "<div class=\"ui info message flash-message flash-info\">\n\t\t<p>", "</p>");
            if (token.Length != 40)
            {
                token = GetStringFromHtmlContent(htmlContent, "<div class=\"ui info message flash-info\">\n\t\t<p>", "</p>");
            }

            if (Regex.IsMatch(token, "^[0-9a-z]{40}$"))
            {
                return token;
            }
            throw new ArgumentException("Unable to extract the token!");
        }

        /// <inheritdoc />
        public async Task<FileSystemObject> GetFileAsync(string org, string app, string filePath, string shortCommitId)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{app}/contents/{filePath}?ref={shortCommitId}");
            return await response.Content.ReadAsAsync<FileSystemObject>();
        }

        /// <inheritdoc/>
        public async Task<List<FileSystemObject>> GetDirectoryAsync(string org, string app, string directoryPath, string shortCommitId)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{app}/contents/{directoryPath}?ref={shortCommitId}");
            return await response.Content.ReadAsAsync<List<FileSystemObject>>();
        }

        /// <inheritdoc/>
        public async Task<bool> CreatePullRequest(string org, string repository, CreatePullRequestOption createPullRequestOption)
        {
            string content = JsonSerializer.Serialize(createPullRequestOption);
            HttpResponseMessage response = await _httpClient.PostAsync($"repos/{org}/{repository}/pulls", new StringContent(content, Encoding.UTF8, "application/json"));

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

        private async Task<string> GetCsrf()
        {
            Uri giteaUrl = BuildGiteaUrl("/user/settings/applications");

            using (HttpClient client = GetWebHtmlClient())
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);

                if (response.StatusCode == HttpStatusCode.OK)
                {
                    string htmlContent = await response.Content.ReadAsStringAsync();

                    return GetStringFromHtmlContent(htmlContent, "<input type=\"hidden\" name=\"_csrf\" value=\"", "\"");
                }
            }

            return null;
        }

        private async Task DeleteCurrentAppKeys(string csrf, string keyName = null)
        {
            Uri giteaUrl = BuildGiteaUrl("/user/settings/applications");
            List<string> appKeyIds = new();

            using (HttpClient client = GetWebHtmlClient())
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string htmlContent = await response.Content.ReadAsStringAsync();
                    appKeyIds = FindAllAppKeysId(htmlContent, keyName);
                }
            }

            await Task.Run(() => DeleteAllAppKeys(appKeyIds, csrf));
        }

        private async Task DeleteAllAppKeys(List<string> appKeys, string csrf)
        {
            Uri giteaUrl = BuildGiteaUrl("/user/settings/applications/delete");

            using (HttpClient client = GetWebHtmlClient())
            {
                foreach (string key in appKeys)
                {
                    _logger.LogInformation("Deleting appkey with id " + key);
                    List<KeyValuePair<string, string>> formValues = new();
                    formValues.Add(new KeyValuePair<string, string>("_csrf", csrf));
                    formValues.Add(new KeyValuePair<string, string>("id", key));

                    FormUrlEncodedContent content = new(formValues);
                    HttpResponseMessage response = await client.PostAsync(giteaUrl, content);
                    if (!response.StatusCode.Equals(HttpStatusCode.OK))
                    {
                        break;
                    }
                }
            }
        }

        private List<string> FindAllAppKeysId(string htmlContent, string keyName = null)
        {
            List<string> htmlValues = new();
            HtmlAgilityPack.HtmlDocument htmlDocument = new();
            htmlDocument.LoadHtml(htmlContent);

            HtmlAgilityPack.HtmlNode node = htmlDocument.DocumentNode.SelectSingleNode("//div[contains(@class, 'ui key list')]");

            HtmlAgilityPack.HtmlNodeCollection nodes = node.ChildNodes;

            foreach (HtmlAgilityPack.HtmlNode keyNode in nodes)
            {
                if (keyNode.OuterHtml.Contains(keyName ?? "AltinnStudioAppKey"))
                {
                    // Returns the button node
                    HtmlAgilityPack.HtmlNode deleteButtonNode = keyNode.SelectSingleNode("./div/button");
                    string dataId = deleteButtonNode.GetAttributeValue("data-id", string.Empty);
                    htmlValues.Add(dataId);
                }
            }

            return htmlValues;
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

        private string GetStringFromHtmlContent(string htmlContent, string inputSearchTextBefore, string inputSearchTextAfter)
        {
            int start = htmlContent.IndexOf(inputSearchTextBefore);

            // Add the lengt of the search string to find the start place for form vlaue
            start += inputSearchTextBefore.Length;

            // Find the end of the input value content in html (input element with " as end)
            int stop = htmlContent.IndexOf(inputSearchTextAfter, start);

            if (start > 0 && stop > 0 && stop > start)
            {
                string formValue = htmlContent.Substring(start, stop - start);
                return formValue;
            }

            return null;
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

        private HttpClient GetWebHtmlClient(bool allowAutoRedirect = true, Cookie tokenCookie = null)
        {
            string giteaSession = AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName);
            Cookie cookie = CreateGiteaSessionCookie(giteaSession);
            CookieContainer cookieContainer = new();
            cookieContainer.Add(cookie);

            if (tokenCookie != null)
            {
                cookieContainer.Add(tokenCookie);
            }

            HttpClientHandler handler = new() { CookieContainer = cookieContainer, AllowAutoRedirect = allowAutoRedirect };

            return new HttpClient(handler);
        }

        private Cookie CreateGiteaSessionCookie(string giteaSession)
        {
            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            return (Environment.GetEnvironmentVariable("ServiceRepositorySettings__ApiEndpointHost") != null)
                    ? new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("ServiceRepositorySettings__ApiEndpointHost"))
                    : new Cookie(_settings.GiteaCookieName, giteaSession, "/", _settings.ApiEndPointHost);
        }

        private Uri BuildGiteaUrl(string path)
        {
            return (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") != null)
                     ? new Uri(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") + path)
                     : new Uri(_settings.RepositoryBaseURL + path);
        }

        private string GetApiEndpointHost()
        {
            return Environment.GetEnvironmentVariable("ServiceRepositorySettings__ApiEndPointHost") ?? _settings.ApiEndPointHost;
        }

        private Cookie StealFlashCookie(HttpResponseMessage response)
        {
            const string flashCookieSuffix = "_flash";
            string setCookieHeader = response.Headers
                .GetValues("Set-Cookie")
                .First(s => s.Contains(flashCookieSuffix))
                .Split(";")
                .First();

            string[] splitSetCookieHeader = setCookieHeader.Split("=");
            string cookieValue = splitSetCookieHeader[1];
            string cookieName = splitSetCookieHeader[0];

            return new Cookie(cookieName, cookieValue, "/", GetApiEndpointHost());
        }


    }
}

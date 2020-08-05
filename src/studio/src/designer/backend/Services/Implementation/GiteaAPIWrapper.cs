using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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
            IOptions<ServiceRepositorySettings> repositorySettings,
            IHttpContextAccessor httpContextAccessor,
            IMemoryCache memoryCache,
            ILogger<GiteaAPIWrapper> logger,
            HttpClient httpClient)
        {
            _settings = repositorySettings.Value;
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
        public async Task<Altinn.Studio.Designer.RepositoryClient.Model.Repository> CreateRepository(string org, CreateRepoOption options)
        {
            var repository = new Altinn.Studio.Designer.RepositoryClient.Model.Repository();
            string developerUserName = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string urlEnd = developerUserName == org ? "user/repos" : $"org/{org}/repos";
            HttpResponseMessage response = await _httpClient.PostAsJsonAsync(urlEnd, options);

            if (response.StatusCode == HttpStatusCode.Created)
            {
                repository = await response.Content.ReadAsAsync<Altinn.Studio.Designer.RepositoryClient.Model.Repository>();
                repository.RepositoryCreatedStatus = HttpStatusCode.Created;
            }
            else if (response.StatusCode == HttpStatusCode.Conflict)
            {
                // The repository with the same name already exists, 409 from Gitea API
                repository.RepositoryCreatedStatus = HttpStatusCode.Conflict;
            }
            else
            {
                _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) +
                    " Create repository failed with statuscode " + response.StatusCode + " for " +
                    org + " and repo-name " + options.Name);
            }

            return repository;
        }

        /// <inheritdoc/>
        public async Task<IList<Altinn.Studio.Designer.RepositoryClient.Model.Repository>> GetUserRepos()
        {
            IList<Altinn.Studio.Designer.RepositoryClient.Model.Repository> repos = new List<Altinn.Studio.Designer.RepositoryClient.Model.Repository>();

            HttpResponseMessage response = await _httpClient.GetAsync("user/repos?limit=50");
            if (response.StatusCode == HttpStatusCode.OK)
            {
                repos = await response.Content.ReadAsAsync<IList<Altinn.Studio.Designer.RepositoryClient.Model.Repository>>();

                foreach (Altinn.Studio.Designer.RepositoryClient.Model.Repository repo in repos)
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

        /// <inheritdoc/>
        public async Task<SearchResults> SearchRepository(bool onlyAdmin, string keyWord, int page)
        {
            User user = await GetCurrentUser();

            SearchResults repository = new SearchResults();
            string giteaSearchUriString = $"repos/search?limit={_settings.RepoSearchPageCount}";
            if (onlyAdmin)
            {
                giteaSearchUriString += $"&uid={user.Id}";
            }

            if (!string.IsNullOrEmpty(keyWord))
            {
                giteaSearchUriString += $"&q={keyWord}";
            }

            bool allElementsRetrieved = false;

            int resultPage = 1;
            if (page != 0)
            {
                resultPage = page;
            }

            int totalCount = 0;

            while (!allElementsRetrieved)
            {
                HttpResponseMessage response = await _httpClient.GetAsync(giteaSearchUriString + "&page=" + resultPage);
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    if (resultPage == 1 || page == resultPage)
                    {
                        // This is the first or a specific page requested
                        repository = await response.Content.ReadAsAsync<SearchResults>();
                    }
                    else
                    {
                        SearchResults pageResultRepository = await response.Content.ReadAsAsync<SearchResults>();
                        repository.Data.AddRange(pageResultRepository.Data);
                    }

                    if (response.Headers.TryGetValues("X-Total-Count", out IEnumerable<string> values))
                    {
                        totalCount = Convert.ToInt32(values.First());
                    }

                    if (page == resultPage
                        || (repository?.Data != null && repository.Data.Count >= totalCount)
                        || (repository?.Data != null && repository.Data.Count >= _settings.RepoSearchPageCount))
                    {
                        allElementsRetrieved = true;
                    }
                    else
                    {
                        resultPage++;
                    }
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " SearchRepository failed with statuscode " + response.StatusCode);
                    allElementsRetrieved = true;
                }
            }

            if (repository?.Data == null || !repository.Data.Any())
            {
                return repository;
            }

            foreach (Altinn.Studio.Designer.RepositoryClient.Model.Repository repo in repository.Data)
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

            return repository;
        }

        /// <inheritdoc/>
        public async Task<Altinn.Studio.Designer.RepositoryClient.Model.Repository> GetRepository(string org, string repository)
        {
            Altinn.Studio.Designer.RepositoryClient.Model.Repository returnRepository = null;

            string giteaUrl = $"repos/{org}/{repository}";
            HttpResponseMessage response = await _httpClient.GetAsync(giteaUrl);
            if (response.StatusCode == HttpStatusCode.OK)
            {
                returnRepository = await response.Content.ReadAsAsync<Altinn.Studio.Designer.RepositoryClient.Model.Repository>();
            }
            else
            {
                _logger.LogError($"User {AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)} fetching app {org}/{repository} failed with reponsecode {response.StatusCode}");
            }

            Stopwatch watchOwnerType = Stopwatch.StartNew();
            if (!string.IsNullOrEmpty(returnRepository?.Owner?.Login))
            {
                Stopwatch watch = Stopwatch.StartNew();
                returnRepository.IsClonedToLocal = IsLocalRepo(returnRepository.Owner.Login, returnRepository.Name);
                watch.Stop();
                _logger.Log(LogLevel.Information, "Islocalrepo - {0} ", watch.ElapsedMilliseconds);
                watch = Stopwatch.StartNew();
                Organization organisation = await GetCachedOrg(returnRepository.Owner.Login);
                watch.Stop();
                _logger.Log(LogLevel.Information, "Getcachedorg - {0} ", watch.ElapsedMilliseconds);
                if (organisation.Id != -1)
                {
                    returnRepository.Owner.UserType = UserType.Org;
                }
            }

            watchOwnerType.Stop();
            _logger.Log(LogLevel.Information, "To find if local repo and owner type - {0} ", watchOwnerType.ElapsedMilliseconds);
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

            _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " Get Organizations failed with statuscode " + response.StatusCode);

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

            await Task.Run(() => DeleteCurrentAppKeys(csrf, keyName));

            Uri giteaUrl = BuildGiteaUrl("/user/settings/applications");

            List<KeyValuePair<string, string>> formValues = new List<KeyValuePair<string, string>>();
            formValues.Add(new KeyValuePair<string, string>("_csrf", csrf));
            formValues.Add(new KeyValuePair<string, string>("name", keyName == null ? "AltinnStudioAppKey" : keyName));
            FormUrlEncodedContent content = new FormUrlEncodedContent(formValues);

            using (HttpClient client = GetWebHtmlClient(false))
            {
                // creating new API key
                HttpResponseMessage response = await client.PostAsync(giteaUrl, content);

                if (response.StatusCode == HttpStatusCode.Redirect)
                {
                    Cookie cookie = StealMacaronCookie(response);

                    using (HttpClient clientWithToken = GetWebHtmlClient(false, cookie))
                    {
                        // reading the API key value
                        HttpResponseMessage tokenResponse = await clientWithToken.GetAsync(giteaUrl);
                        string htmlContent = await tokenResponse.Content.ReadAsStringAsync();
                        string token = GetStringFromHtmlContent(htmlContent, "<div class=\"ui info message\">\n\t\t<p>", "</p>");
                        List<string> keys = FindAllAppKeysId(htmlContent, keyName);

                        KeyValuePair<string, string> keyValuePair = new KeyValuePair<string, string>(keys.FirstOrDefault() ?? "1", token);

                        return keyValuePair;
                    }
                }
            }

            return null;
        }

        /// <inheritdoc />
        public async Task<GiteaFileContent> GetFileAsync(string org, string app, string filePath, string shortCommitId)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{app}/contents/{filePath}?ref={shortCommitId}");
            return await response.Content.ReadAsAsync<GiteaFileContent>();
        }

        /// <inheritdoc/>
        public async Task<List<GiteaFileContent>> GetDirectoryAsync(string org, string app, string directoryPath, string shortCommitId)
        {
            HttpResponseMessage response = await _httpClient.GetAsync($"repos/{org}/{app}/contents/{directoryPath}?ref={shortCommitId}");
            return await response.Content.ReadAsAsync<List<GiteaFileContent>>();
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

                if (response.StatusCode == System.Net.HttpStatusCode.OK)
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
            List<string> appKeyIds = new List<string>();

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
                    List<KeyValuePair<string, string>> formValues = new List<KeyValuePair<string, string>>();
                    formValues.Add(new KeyValuePair<string, string>("_csrf", csrf));
                    formValues.Add(new KeyValuePair<string, string>("id", key));

                    FormUrlEncodedContent content = new FormUrlEncodedContent(formValues);
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
            List<string> htmlValues = new List<string>();
            HtmlAgilityPack.HtmlDocument htmlDocument = new HtmlAgilityPack.HtmlDocument();
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
                    using (LibGit2Sharp.Repository repo = new LibGit2Sharp.Repository(localAppRepoFolder))
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
                    organisation = await GetOrganization(cachekey);
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

                var cacheEntryOptions = new MemoryCacheEntryOptions()

                // Keep in cache for this time, reset time if accessed.
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
            CookieContainer cookieContainer = new CookieContainer();
            cookieContainer.Add(cookie);

            if (tokenCookie != null)
            {
                cookieContainer.Add(tokenCookie);
            }

            HttpClientHandler handler = new HttpClientHandler() { CookieContainer = cookieContainer, AllowAutoRedirect = allowAutoRedirect };

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

        private Cookie StealMacaronCookie(HttpResponseMessage response)
        {
            string macaronFlashKey = "macaron_flash";
            string setCookieHeader = response.Headers.GetValues("Set-Cookie")
                .Where(s => s.Contains(macaronFlashKey))
                .First()
                .Split(";")[0];

            var splitSetCookieHeader = setCookieHeader.Split("=");
            string macaronFlashValue = splitSetCookieHeader[1];

            return new Cookie(macaronFlashKey, macaronFlashValue, "/", GetApiEndpointHost());
        }
    }
}

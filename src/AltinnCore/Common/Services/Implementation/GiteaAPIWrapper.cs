using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.RepositoryClient.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace AltinnCore.Common.Services.Implementation
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

        /// <summary>
        /// Initializes a new instance of the <see cref="GiteaAPIWrapper"/> class
        /// </summary>
        /// <param name="repositorySettings">the repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="memoryCache">The configured memory cache</param>
        /// <param name="logger">The configured logger</param>
        public GiteaAPIWrapper(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, IMemoryCache memoryCache, ILogger<GiteaAPIWrapper> logger)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _cache = memoryCache;
            _logger = logger;
        }

        /// <inheritdoc/>
        public async Task<AltinnCore.RepositoryClient.Model.User> GetCurrentUser()
        {
            AltinnCore.RepositoryClient.Model.User user = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(AltinnCore.RepositoryClient.Model.User));
            Uri endpointUrl = new Uri(GetApiBaseUrl() + "/user");

            using (HttpClient client = GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(endpointUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    user = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.User;
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " Get current user failed with statuscode " + response.StatusCode);
                }
            }

            return user;
        }

        /// <summary>
        /// Create repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="createRepoOption">the options for creating repository</param>
        /// <returns>The newly created repository</returns>
        public async Task<Repository> CreateRepository(string org, CreateRepoOption createRepoOption)
        {
            AltinnCore.RepositoryClient.Model.Repository repository = new Repository();
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(AltinnCore.RepositoryClient.Model.Repository));
            string urlEnd = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) == org ? "/user/repos" : "/org/" + org + "/repos";
            Uri endpointUrl = new Uri(GetApiBaseUrl() + urlEnd);
            using (HttpClient client = GetApiClient())
            {
                HttpResponseMessage response = await client.PostAsJsonAsync<CreateRepoOption>(endpointUrl, createRepoOption);
                if (response.StatusCode == System.Net.HttpStatusCode.Created)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    StreamReader reader = new StreamReader(stream);
                    string repo = reader.ReadToEnd();
                    repository = JsonConvert.DeserializeObject<Repository>(repo);
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " Create repository failed with statuscode " + response.StatusCode + " for " + org + " and reponame " + createRepoOption.Name);
                }

                repository.RepositoryCreatedStatus = response.StatusCode;
            }

            return repository;
        }

        /// <inheritdoc/>
        public async Task<SearchResults> SearchRepository(bool onlyAdmin, string keyWord, int page)
        {
            User user = GetCurrentUser().Result;

            SearchResults repository = new SearchResults();
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(SearchResults));

            Uri giteaUrl = new Uri(GetApiBaseUrl() + "/repos/search?");

            giteaUrl = new Uri(giteaUrl.OriginalString + "limit=" + _settings.RepoSearchPageCount);

            if (onlyAdmin)
            {
                giteaUrl = new Uri(giteaUrl.OriginalString + "&uid=" + user.Id);
            }

            if (!string.IsNullOrEmpty(keyWord))
            {
                giteaUrl = new Uri(giteaUrl.OriginalString + "&q=" + keyWord);
            }

            using (HttpClient client = GetApiClient())
            {
                bool allElementsRetrieved = false;

                int resultPage = 1;
                if (page != 0)
                {
                    resultPage = page;
                }

                int totalCount = 0;

                while (!allElementsRetrieved)
                {
                    Uri tempUrl = new Uri(giteaUrl.OriginalString + "&page=" + resultPage);

                    HttpResponseMessage response = await client.GetAsync(tempUrl);
                    if (response.StatusCode == System.Net.HttpStatusCode.OK)
                    {
                        Stream stream = await response.Content.ReadAsStreamAsync();
                        if (resultPage == 1 || page == resultPage)
                        {
                            // This is the first or a specific page requested                            
                            SearchResults pageResultRepository = new SearchResults();
                            StreamReader reader = new StreamReader(stream);
                            string searchResultText = reader.ReadToEnd();
                            repository = JsonConvert.DeserializeObject<SearchResults>(searchResultText);
                        }
                        else
                        {
                            SearchResults pageResultRepository = new SearchResults();
                            StreamReader reader = new StreamReader(stream);
                            string searchResultText = reader.ReadToEnd();
                            pageResultRepository = JsonConvert.DeserializeObject<SearchResults>(searchResultText);

                            //SearchResults pageResultRepository = serializer.ReadObject(stream) as SearchResults;
                            repository.Data.AddRange(pageResultRepository.Data);
                        }

                        IEnumerable<string> values;
                        if (response.Headers.TryGetValues("X-Total-Count", out values))
                        {
                            totalCount = Convert.ToInt32(values.First());
                        }

                        if (page == resultPage
                            || (repository != null && repository.Data != null && repository.Data.Count >= totalCount)
                            || (repository != null && repository.Data != null && repository.Data.Count >= _settings.RepoSearchPageCount))
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
            }

            if (repository != null && repository.Data != null && repository.Data.Any())
            {
                foreach (Repository repo in repository.Data)
                {
                    if (repo.Owner != null && !string.IsNullOrEmpty(repo.Owner.Login))
                    {
                        repo.IsClonedToLocal = IsLocalRepo(repo.Owner.Login, repo.Name);
                        Organization org = await GetCachedOrg(repo.Owner.Login);
                        if (org.Id != -1)
                        {
                            repo.Owner.UserType = UserType.Org;
                        }
                    }
                }
            }

            return repository;
        }

        /// <inheritdoc/>
        public async Task<Repository> GetRepository(string org, string repository)
        {
            Repository returnRepository = null;            

            Uri giteaUrl = new Uri(GetApiBaseUrl() + $"/repos/{org}/{repository}");

            using (HttpClient client = GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    {                        
                        StreamReader reader = new StreamReader(stream);
                        string repo = reader.ReadToEnd();
                        returnRepository = JsonConvert.DeserializeObject<Repository>(repo);

                    }
                }
                else
                {
                    _logger.LogError($"User {AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext)} fetching app {org}/{repository} failed with reponsecode {response.StatusCode}");
                }
            }

            var watchOwnerType = System.Diagnostics.Stopwatch.StartNew();
            if (returnRepository != null && returnRepository.Owner != null && !string.IsNullOrEmpty(returnRepository.Owner.Login))
            {
                var watch = System.Diagnostics.Stopwatch.StartNew();
                returnRepository.IsClonedToLocal = IsLocalRepo(returnRepository.Owner.Login, returnRepository.Name);
                watch.Stop();
                _logger.Log(Microsoft.Extensions.Logging.LogLevel.Information, "Islocalrepo - {0} ", watch.ElapsedMilliseconds);
                watch = System.Diagnostics.Stopwatch.StartNew();
                Organization organisation = await GetCachedOrg(returnRepository.Owner.Login);
                watch.Stop();
                _logger.Log(Microsoft.Extensions.Logging.LogLevel.Information, "Getcachedorg - {0} ", watch.ElapsedMilliseconds);
                if (organisation.Id != -1)
                {
                    returnRepository.Owner.UserType = UserType.Org;
                }
            }

            watchOwnerType.Stop();
            _logger.Log(Microsoft.Extensions.Logging.LogLevel.Information, "To find if local repo and owner type - {0} ", watchOwnerType.ElapsedMilliseconds);
            return returnRepository;
        }

        /// <summary>
        /// Gets a list over the organisations that the current user has access to.
        /// </summary>
        /// <returns>A list over all</returns>
        public async Task<List<AltinnCore.RepositoryClient.Model.Organization>> GetUserOrganizations()
        {
            List<AltinnCore.RepositoryClient.Model.Organization> organisations = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(List<AltinnCore.RepositoryClient.Model.Organization>));
            Uri giteaUrl = new Uri(GetApiBaseUrl() + "/user/orgs");

            using (HttpClient client = GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    organisations = serializer.ReadObject(stream) as List<AltinnCore.RepositoryClient.Model.Organization>;
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " Get Organizations failed with statuscode " + response.StatusCode);
                }
            }

            return organisations;
        }

        /// <summary>
        /// Returns information about an organisation based on name
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <returns>The organisation object</returns>
        public async Task<AltinnCore.RepositoryClient.Model.Organization> GetOrganization(string org)
        {
            AltinnCore.RepositoryClient.Model.Organization organisation = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(AltinnCore.RepositoryClient.Model.Organization));
            Uri giteaUrl = new Uri(GetApiBaseUrl() + "/orgs/" + org);
            using (HttpClient client = GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    organisation = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.Organization;
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetOrganization failed with statuscode " + response.StatusCode + "for " + org);
                }
            }

            return organisation;
        }

        /// <summary>
        /// Returns all branch information for a repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repo">The name of the repo</param>
        /// <returns>The branches</returns>
        public async Task<List<Branch>> GetBranches(string org, string repo)
        {
            List<Branch> branches = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(List<Branch>));
            Uri giteaUrl = new Uri(GetApiBaseUrl() + "/repos/" + org + "/" + repo + "/branches");
            using (HttpClient client = GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    branches = serializer.ReadObject(stream) as List<Branch>;
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetBranches response failed with statuscode " + response.StatusCode + " for " + org + " " + repo);
                }
            }

            return branches;
        }

        /// <inheritdoc />
        public async Task<Branch> GetBranch(string org, string repository, string branch)
        {
            Branch branchinfo = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Branch));
            Uri giteaUrl = new Uri($"{GetApiBaseUrl()}/repos/{org}/{repository}/branches/{branch}");
            using (HttpClient client = GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    branchinfo = serializer.ReadObject(stream) as Branch;
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetBranch response failed with statuscode " + response.StatusCode + " for " + org + " / " + repository + " branch: " + branch);
                }
            }

            return branchinfo;
        }

        /// <summary>
        /// This method screen scrapes the user from the profile ui in GITEA.
        /// This was needed when GITEA changed their API policy in 1.5.2 and requiring
        /// only API calls with token. This is currently the only known way to get
        /// info about the logged in user in GITEA.
        /// </summary>
        /// <returns>Returns the logged in user</returns>
        public async Task<string> GetUserNameFromUI()
        {
            Uri giteaUrl = BuildGiteaUrl("/user/settings/");
            using (HttpClient client = GetWebHtmlClient(false))
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string htmlContent = await response.Content.ReadAsStringAsync();

                    return GetStringFromHtmlContent(htmlContent, "<input id=\"username\" name=\"name\" value=\"", "\"");
                }
            }

            return null;
        }

        /// <summary>
        /// This method generates a application key in GITEA with
        /// help of screen scraping the Application form in GITEA
        /// This is the only  way (currently) to generate a APP key without involving the user in
        /// </summary>
        /// <returns>A newly generated token</returns>
        public async Task<KeyValuePair<string, string>?> GetSessionAppKey(string keyName = null)
        {
            string csrf = GetCsrf().Result;

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

                if (response.StatusCode == System.Net.HttpStatusCode.Redirect)
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
                if (keyNode.OuterHtml.Contains(keyName == null ? "AltinnStudioAppKey" : keyName))
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
                organisation = await GetOrganization(org);

                // Null value is not cached. so set id property to -1
                if (organisation == null)
                {
                    organisation = new Organization();
                    organisation.Id = -1;
                }

                var cacheEntryOptions = new MemoryCacheEntryOptions()

                // Keep in cache for this time, reset time if accessed.
                .SetSlidingExpiration(TimeSpan.FromSeconds(3600));

                // Save data in cache.
                _cache.Set(cachekey, organisation, cacheEntryOptions);
            }

            return organisation;
        }

        private string GetApiBaseUrl()
        {
            return Environment.GetEnvironmentVariable("ServiceRepositorySettings__ApiEndPoint") ?? _settings.ApiEndPoint;    
        }

        private HttpClient GetApiClient(bool allowAutoRedirect = true)
        {
            HttpClientHandler httpClientHandler = new HttpClientHandler();
            httpClientHandler.AllowAutoRedirect = allowAutoRedirect;

            HttpClient client = new HttpClient(httpClientHandler);
            client.DefaultRequestHeaders.Add(Constants.General.AuthorizationTokenHeaderName, AuthenticationHelper.GetDeveloperTokenHeaderValue(_httpContextAccessor.HttpContext));
            return client;
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

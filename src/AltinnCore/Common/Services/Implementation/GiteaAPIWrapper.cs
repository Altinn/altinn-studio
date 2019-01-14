using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.RepositoryClient.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AltinnCore.Common.Services.Implementation
{
    /// <summary>
    /// Implementation for gitea wrapper
    /// </summary>
    public class GiteaAPIWrapper : IGitea
    {
        private readonly ServiceRepositorySettings _settings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private IMemoryCache _cache;
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
        /// <param name="org">the organisation</param>
        /// <param name="createRepoOption">the options for creating repository</param>
        /// <returns>The newly created repository</returns>
        public async Task<Repository> CreateRepositoryForOrg(string org, CreateRepoOption createRepoOption)
        {
            AltinnCore.RepositoryClient.Model.Repository repository = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(AltinnCore.RepositoryClient.Model.Repository));

            Uri endpointUrl = new Uri(GetApiBaseUrl() + "/org/" + org + "/repos");
           
            using (HttpClient client = GetApiClient())
            {
                HttpResponseMessage response = await client.PostAsJsonAsync<CreateRepoOption>(endpointUrl, createRepoOption);
                if (response.StatusCode == System.Net.HttpStatusCode.Created)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    repository = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.Repository;
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " Create repository failed with statuscode " + response.StatusCode + " for " + org + " and reponame " + createRepoOption.Name);
                }
            }

            return repository;
        }

        /// <inheritdoc/>
        public async Task<SearchResults> SearchRepository(bool onlyAdmin, string keyWord, int page)
        {
            User user = GetCurrentUser().Result;

            SearchResults repository = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(SearchResults));

            Uri giteaUrl = new Uri(GetApiBaseUrl() + "/repos/search?");

            giteaUrl = new Uri(giteaUrl.OriginalString + "limit=" + _settings.RepoSearchPageCount);
            giteaUrl = new Uri(giteaUrl.OriginalString + "&page=" + page);
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
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    repository = serializer.ReadObject(stream) as SearchResults;
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " SearchRepository failed with statuscode " + response.StatusCode);
                }
            }

            if (repository.Data.Any())
            {
                foreach (Repository repo in repository.Data)
                {
                    if (repo.Owner != null && !string.IsNullOrEmpty(repo.Owner.Login))
                    {
                        Organization org = await GetCachedOrg(repo.Owner.Login);
                        if (org != null)
                        {
                            repo.Owner.UserType = UserType.Org;
                        }
                    }
                }
            }

            return repository;
        }

        /// <summary>
        /// Gets a list over the organizations that the current user has access to.
        /// </summary>
        /// <returns>A list over all</returns>
        public async Task<List<AltinnCore.RepositoryClient.Model.Organization>> GetUserOrganizations()
        {
            List<AltinnCore.RepositoryClient.Model.Organization> organizations = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(List<AltinnCore.RepositoryClient.Model.Organization>));
            Uri giteaUrl = new Uri(GetApiBaseUrl() + "/user/orgs");

            using (HttpClient client = GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    organizations = serializer.ReadObject(stream) as List<AltinnCore.RepositoryClient.Model.Organization>;
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " Get Organizations failed with statuscode " + response.StatusCode);
                }
            }

            return organizations;
        }

        /// <summary>
        /// Returns information about a organization based on name
        /// </summary>
        /// <param name="name">The name of the organization</param>
        /// <returns>The organization</returns>
        public async Task<AltinnCore.RepositoryClient.Model.Organization> GetOrganization(string name)
        {
            AltinnCore.RepositoryClient.Model.Organization organization = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(AltinnCore.RepositoryClient.Model.Organization));
            Uri giteaUrl = new Uri(GetApiBaseUrl() + "/orgs/" + name);

            using (HttpClient client = GetApiClient())
            {
                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    organization = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.Organization;
                }
                else
                {
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetOrganization failed with statuscode " + response.StatusCode + "for " + name);
                }
            }

            return organization;
        }

        /// <summary>
        /// Returns all branch information for a repository
        /// </summary>
        /// <param name="owner">The owner</param>
        /// <param name="repo">The name of the repo</param>
        /// <returns>The branches</returns>
        public async Task<List<Branch>> GetBranches(string owner, string repo)
        {
            List<Branch> branches = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(List<Branch>));
            Uri giteaUrl = new Uri(GetApiBaseUrl() + "/repos/" + owner + "/" + repo + "/branches");
         
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
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetBranches response failed with statuscode " + response.StatusCode + " for " + owner + " " + repo);
                }
            }

            return branches;
        }

        /// <summary>
        /// Returns all branch information for a repository
        /// </summary>
        /// <param name="owner">The owner</param>
        /// <param name="repo">The name of the repo</param>
        /// <param name="branch">Name of branch</param>
        /// <returns>The branches</returns>
        public async Task<Branch> GetBranch(string owner, string repo, string branch)
        {
            Branch branchinfo = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(Branch));
            Uri giteaUrl = new Uri(GetApiBaseUrl() + "/repos/" + owner + "/" + repo + "/branches/" + branch);

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
                    _logger.LogError("User " + AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext) + " GetBranch response failed with statuscode " + response.StatusCode + " for " + owner + " / " + repo + " branch: " + branch);
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
            Uri giteaUrl = null;
            Cookie cookie = null;

            string giteaSession = AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName);

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") != null && Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") + "user/settings/");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("GiteaEndpoint"));
            }
            else
            {
                giteaUrl = new Uri(_settings.RepositoryBaseURL + "user/settings");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", _settings.ApiEndPointHost);
            }

            CookieContainer cookieContainer = new CookieContainer();
            cookieContainer.Add(cookie);
            HttpClientHandler handler = new HttpClientHandler() { CookieContainer = cookieContainer };
            handler.AllowAutoRedirect = false;
            using (HttpClient client = new HttpClient(handler))
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
        public async Task<string> GetSessionAppKey()
        {
            string csrf = GetCsrf().Result;

            Uri giteaUrl = null;
            Cookie cookie = null;
            string giteaSession = AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName);

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") != null && Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") + "user/settings/applications");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("GiteaEndpoint"));
            }
            else
            {
                giteaUrl = new Uri(_settings.RepositoryBaseURL + "user/settings/applications");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", _settings.ApiEndPointHost);
            }

            CookieContainer cookieContainer = new CookieContainer();
            cookieContainer.Add(cookie);
            HttpClientHandler handler = new HttpClientHandler() { CookieContainer = cookieContainer };

            List<KeyValuePair<string, string>> formValues = new List<KeyValuePair<string, string>>();
            formValues.Add(new KeyValuePair<string, string>("_csrf", csrf));
            formValues.Add(new KeyValuePair<string, string>("name", "AltinnStudioAppKey"));

            FormUrlEncodedContent content = new FormUrlEncodedContent(formValues);

            using (HttpClient client = new HttpClient(handler))
            {
                HttpResponseMessage response = await client.PostAsync(giteaUrl, content);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    string htmlContent = await response.Content.ReadAsStringAsync();

                    return GetStringFromHtmlContent(htmlContent, "<div class=\"ui info message\">\n\t\t<p>", "</p>");
                }
            }

            return null;
        }

        private async Task<string> GetCsrf()
        {
            Uri giteaUrl = null;
            Cookie cookie = null;
            string giteaSession = AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName);

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") != null && Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryBaseURL") + "user/settings/applications");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("RepositoryBaseURL"));
            }
            else
            {
                giteaUrl = new Uri(_settings.RepositoryBaseURL + "user/settings/applications");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", _settings.ApiEndPointHost);
            }

            CookieContainer cookieContainer = new CookieContainer();
            cookieContainer.Add(cookie);
            HttpClientHandler handler = new HttpClientHandler() { CookieContainer = cookieContainer };
            using (HttpClient client = new HttpClient(handler))
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

        private async Task<Organization> GetCachedOrg(string orgName)
        {
            Organization org = null;
            string cachekey = "org_" + orgName;

            if (!_cache.TryGetValue(cachekey, out org))
            {
                org = await GetOrganization(orgName);
                var cacheEntryOptions = new MemoryCacheEntryOptions()

                // Keep in cache for this time, reset time if accessed.
                .SetSlidingExpiration(TimeSpan.FromSeconds(3600));

                // Save data in cache.
                _cache.Set(cachekey, org, cacheEntryOptions);
            }

            return org;
        }

        private string GetApiBaseUrl()
        {
            string baseUrl = string.Empty;
            if (Environment.GetEnvironmentVariable("GiteaApiEndpoint") != null && Environment.GetEnvironmentVariable("GiteaEndpoint") != null)
            {
                baseUrl = Environment.GetEnvironmentVariable("GiteaApiEndpoint");
            }
            else
            {
                baseUrl = _settings.ApiEndPoint;
            }

            return baseUrl;
        }

        private HttpClient GetApiClient(bool allowAutoRedirect = true)
        {
            HttpClientHandler httpClientHandler = new HttpClientHandler();
            httpClientHandler.AllowAutoRedirect = allowAutoRedirect;

            HttpClient client = new HttpClient(httpClientHandler);
            client.DefaultRequestHeaders.Add(Constants.General.AuthorizationTokenHeaderName, AuthenticationHelper.GetDeveloperTokenHeaderValue(_httpContextAccessor.HttpContext));
            return client;
        }
    }
}

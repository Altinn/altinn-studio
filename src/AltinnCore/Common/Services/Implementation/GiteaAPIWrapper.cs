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

        /// <summary>
        /// Initializes a new instance of the <see cref="GiteaAPIWrapper"/> class
        /// </summary>
        /// <param name="repositorySettings">the repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        /// <param name="memoryCache">The configured memory cache</param>
        public GiteaAPIWrapper(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor, IMemoryCache memoryCache)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
            _cache = memoryCache;
        }

        /// <inheritdoc/>
        public async Task<AltinnCore.RepositoryClient.Model.User> GetCurrentUser(string giteaSession)
        {
            AltinnCore.RepositoryClient.Model.User user = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(AltinnCore.RepositoryClient.Model.User));
            Uri giteaUrl = null;
            Cookie cookie = null;

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            if (Environment.GetEnvironmentVariable("GiteaApiEndpoint") != null && Environment.GetEnvironmentVariable("GiteaEndpoint") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("GiteaApiEndpoint") + "/user");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("GiteaEndpoint"));
            }
            else
            {
                giteaUrl = new Uri(_settings.ApiEndPoint + "/user");
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
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    user = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.User;
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    // User is not logged in.
                    return null;
                }
                else
                {
                    // Will cause an exception Temporary workaround
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    user = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.User;
                }
            }

            return user;
        }

        /// <summary>
        /// Create repository
        /// </summary>
        /// <param name="giteaSession">the gitea session</param>
        /// <param name="org">the organisation</param>
        /// <param name="createRepoOption">the options for creating repository</param>
        /// <returns>The newly created repository</returns>
        public async Task<Repository> CreateRepositoryForOrg(string giteaSession, string org, CreateRepoOption createRepoOption)
        {
            AltinnCore.RepositoryClient.Model.Repository repository = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(AltinnCore.RepositoryClient.Model.Repository));

            Uri giteaUrl = new Uri(_settings.ApiEndPoint + "/org/" + org + "/repos");
            Cookie cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", _settings.ApiEndPointHost);

            if (Environment.GetEnvironmentVariable("GiteaApiEndpoint") != null && Environment.GetEnvironmentVariable("GiteaEndpoint") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("GiteaApiEndpoint") + "/org/" + org + "/repos");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("GiteaEndpoint"));
            }

            CookieContainer cookieContainer = new CookieContainer();
            cookieContainer.Add(cookie);
            HttpClientHandler handler = new HttpClientHandler() { CookieContainer = cookieContainer };

            using (HttpClient client = new HttpClient(handler))
            {
                HttpResponseMessage response = await client.PostAsJsonAsync<CreateRepoOption>(giteaUrl, createRepoOption);
                if (response.StatusCode == System.Net.HttpStatusCode.Created)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    repository = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.Repository;
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    // User is not logged in.
                    return null;
                }
                else
                {
                    // Will cause an exception Temporary workaround
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    repository = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.Repository;
                }
            }

            return repository;
        }

        /// <inheritdoc/>
        public async Task<SearchResults> SearchRepository(bool onlyAdmin, string keyWord, int page)
        {
            string giteaSession = AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName);
            User user = GetCurrentUser(giteaSession).Result;

            SearchResults repository = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(SearchResults));

            Uri giteaUrl = null;
            if (Environment.GetEnvironmentVariable("GiteaApiEndpoint") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("GiteaApiEndpoint") + "/repos/search?");
            }
            else
            {
                giteaUrl = new Uri(_settings.ApiEndPoint + "/repos/search?");
            }

            giteaUrl = new Uri(giteaUrl.OriginalString + "limit=" + 50);
            giteaUrl = new Uri(giteaUrl.OriginalString + "&page=" + page);
            if (onlyAdmin)
            {
                giteaUrl = new Uri(giteaUrl.OriginalString + "&uid=" + user.Id);
            }

            if (!string.IsNullOrEmpty(keyWord))
            {
                giteaUrl = new Uri(giteaUrl.OriginalString + "&q=" + keyWord);
            }

            Cookie cookie = null;
            if (Environment.GetEnvironmentVariable("GiteaEndpoint") != null)
            {
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("GiteaEndpoint"));
            }
            else
            {
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
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    repository = serializer.ReadObject(stream) as SearchResults;
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    // User is not logged in.
                    return null;
                }
                else
                {
                    // Will cause an exception Temporary workaround
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    repository = serializer.ReadObject(stream) as SearchResults;
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
        /// Does not work because of GITEA BUG. Will create Issue for the one mentioned here
        /// https://github.com/go-gitea/gitea/issues/3842
        /// </summary>
        /// <param name="tokenName">app token name</param>
        /// <param name="userName">The username of the token</param>
        /// <param name="password">The password of the user</param>
        /// <returns>null</returns>
        public async Task<string> CreateAppToken(string tokenName, string userName, string password)
        {
            string token = null;
            CreateAccessTokenOption tokenOption = new CreateAccessTokenOption(tokenName);
 
            string giteaSession = AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName);
            User user = GetCurrentUser(giteaSession).Result;

            Uri giteaUrl = new Uri(_settings.ApiEndPoint + "/users/" + user.Login + "/tokens");
            Cookie cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", _settings.ApiEndPointHost);
            if (Environment.GetEnvironmentVariable("GiteaApiEndpoint") != null && Environment.GetEnvironmentVariable("GiteaEndpoint") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("GiteaApiEndpoint") + "/users/" + user.Login + "/tokens");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("GiteaEndpoint"));
            }

            using (HttpClient client = new HttpClient())
            {
                byte[] byteArray = Encoding.ASCII.GetBytes(userName + ":" + password);
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(byteArray));

                HttpResponseMessage response = await client.PostAsJsonAsync<CreateAccessTokenOption>(giteaUrl, tokenOption);
                if (response.StatusCode == System.Net.HttpStatusCode.Created)
                {
                    token = tokenName;
                    return token;

                    // TODO. The service should return header value, but does not. Will try it out on next version.
                    // token = response.Headers.GetValues("sha1").FirstOrDefault();
                }
               
                return null;
            }
        }

        /// <summary>
        /// List app tokens for a user. Warning there is talks about removing this.
        /// </summary>
        /// <param name="userName">The user name</param>
        /// <param name="password">The password</param>
        /// <returns>The sha1 value</returns>
        public async Task<List<AltinnCore.RepositoryClient.Model.AccessToken>> ListAccessTokens(string userName, string password)
        {
            List<AltinnCore.RepositoryClient.Model.AccessToken> accessTokens = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(List<AltinnCore.RepositoryClient.Model.AccessToken>));

            string giteaSession = AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName);
            User user = GetCurrentUser(giteaSession).Result;

            Uri giteaUrl = new Uri(_settings.ApiEndPoint + "/users/" + user.Login + "/tokens");
            Cookie cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", _settings.ApiEndPointHost);
            if (Environment.GetEnvironmentVariable("GiteaApiEndpoint") != null && Environment.GetEnvironmentVariable("GiteaEndpoint") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("GiteaApiEndpoint") + "/users/" + user.Login + "/tokens");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("GiteaEndpoint"));
            }

            using (HttpClient client = new HttpClient())
            {
                byte[] byteArray = Encoding.ASCII.GetBytes(userName + ":" + password);
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(byteArray));

                HttpResponseMessage response = await client.GetAsync(giteaUrl);
                if (response.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    accessTokens = serializer.ReadObject(stream) as List<AltinnCore.RepositoryClient.Model.AccessToken>;
                    return accessTokens;
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    // User is not logged in.
                    return null;
                }

                return null;
            }
        }

        /// <summary>
        /// Gets a list over the organizations that the current user has access to.
        /// </summary>
        /// <param name="giteaSession">The sessionId</param>
        /// <returns>A list over all</returns>
        public async Task<List<AltinnCore.RepositoryClient.Model.Organization>> GetUserOrganizations(string giteaSession)
        {
            List<AltinnCore.RepositoryClient.Model.Organization> organizations = null;
            DataContractJsonSerializer serializer = new DataContractJsonSerializer(typeof(List<AltinnCore.RepositoryClient.Model.Organization>));
            Uri giteaUrl = null;
            Cookie cookie = null;

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            if (Environment.GetEnvironmentVariable("GiteaApiEndpoint") != null && Environment.GetEnvironmentVariable("GiteaEndpoint") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("GiteaApiEndpoint") + "/user/orgs");
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("GiteaEndpoint"));
            }
            else
            {
                giteaUrl = new Uri(_settings.ApiEndPoint + "/user/orgs");
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
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    organizations = serializer.ReadObject(stream) as List<AltinnCore.RepositoryClient.Model.Organization>;
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    // User is not logged in.
                    return null;
                }
                else
                {
                    // Will cause an exception Temporary workaround
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    organizations = serializer.ReadObject(stream) as List<AltinnCore.RepositoryClient.Model.Organization>;
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
            Uri giteaUrl = null;
            Cookie cookie = null;

            string giteaSession = AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName);

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            if (Environment.GetEnvironmentVariable("GiteaApiEndpoint") != null && Environment.GetEnvironmentVariable("GiteaEndpoint") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("GiteaApiEndpoint") + "/orgs/" + name);
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("GiteaEndpoint"));
            }
            else
            {
                giteaUrl = new Uri(_settings.ApiEndPoint + "/orgs/" + name);
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
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    organization = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.Organization;
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return null;
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    // User is not logged in.
                    return null;
                }
                else
                {
                    // Will cause an exception Temporary workaround
                    Stream stream = await response.Content.ReadAsStreamAsync();
                    organization = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.Organization;
                }
            }

            return organization;
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
    }
}

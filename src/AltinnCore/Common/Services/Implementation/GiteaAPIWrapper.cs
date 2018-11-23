using System;
using System.Collections.Generic;
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

        /// <summary>
        /// Initializes a new instance of the <see cref="GiteaAPIWrapper"/> class
        /// </summary>
        /// <param name="repositorySettings">the repository settings</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        public GiteaAPIWrapper(IOptions<ServiceRepositorySettings> repositorySettings, IHttpContextAccessor httpContextAccessor)
        {
            _settings = repositorySettings.Value;
            _httpContextAccessor = httpContextAccessor;
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
                var response = client.GetAsync(giteaUrl);
                if (response.Result.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Result.Content.ReadAsStreamAsync();
                    user = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.User;
                }
                else if (response.Result.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.Result.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    // User is not logged in.
                    return null;
                }
                else
                {
                    // Will cause an exception Temporary workaround
                    Stream stream = await response.Result.Content.ReadAsStreamAsync();
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
                var response = client.PostAsJsonAsync<CreateRepoOption>(giteaUrl, createRepoOption);
                if (response.Result.StatusCode == System.Net.HttpStatusCode.Created)
                {
                    Stream stream = await response.Result.Content.ReadAsStreamAsync();
                    repository = serializer.ReadObject(stream) as AltinnCore.RepositoryClient.Model.Repository;
                }
                else if (response.Result.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.Result.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    // User is not logged in.
                    return null;
                }
                else
                {
                    // Will cause an exception Temporary workaround
                    Stream stream = await response.Result.Content.ReadAsStreamAsync();
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
                var response = client.GetAsync(giteaUrl);
                if (response.Result.StatusCode == System.Net.HttpStatusCode.OK)
                {
                    Stream stream = await response.Result.Content.ReadAsStreamAsync();
                    repository = serializer.ReadObject(stream) as SearchResults;
                }
                else if (response.Result.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.Result.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    // User is not logged in.
                    return null;
                }
                else
                {
                    // Will cause an exception Temporary workaround
                    Stream stream = await response.Result.Content.ReadAsStreamAsync();
                    repository = serializer.ReadObject(stream) as SearchResults;
                }
            }

            return repository;
        }

        /// <summary>
        /// Does not work because of GITEA BUG. Will create Issue for the one mentioned here
        /// https://github.com/go-gitea/gitea/issues/3842
        /// </summary>
        /// <param name="name">app token name</param>
        /// <returns>null</returns>
        public string CreateAppToken(string name)
        {
            string token = null;

            string giteaSession = AuthenticationHelper.GetGiteaSession(_httpContextAccessor.HttpContext, _settings.GiteaCookieName);
            User user = GetCurrentUser(giteaSession).Result;

            Uri giteaUrl = new Uri(_settings.ApiEndPoint + "/users/" + user.Login + "/tokens?name=" + name);
            Cookie cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", _settings.ApiEndPointHost);
            if (Environment.GetEnvironmentVariable("GiteaApiEndpoint") != null && Environment.GetEnvironmentVariable("GiteaEndpoint") != null)
            {
                giteaUrl = new Uri(Environment.GetEnvironmentVariable("GiteaApiEndpoint") + "/users/" + user.Login + "/tokens?name=" + name);
                cookie = new Cookie(_settings.GiteaCookieName, giteaSession, "/", Environment.GetEnvironmentVariable("GiteaEndpoint"));
            }

            CookieContainer cookieContainer = new CookieContainer();
            cookieContainer.Add(cookie);
            HttpClientHandler handler = new HttpClientHandler() { CookieContainer = cookieContainer };

            using (HttpClient client = new HttpClient(handler))
            {
                var response = client.PostAsync(giteaUrl, null);
                if (response.Result.StatusCode == System.Net.HttpStatusCode.Created)
                {
                    token = response.Result.Headers.GetValues("sha1").FirstOrDefault();
                }
                else if (response.Result.StatusCode == System.Net.HttpStatusCode.Forbidden ||
                response.Result.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    // User is not logged in.
                    return null;
                }

                return null;
            }
        }
    }
}

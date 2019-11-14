using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Services.Interfaces;
using AltinnCore.Designer.Services.Models;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Services
{
    /// <summary>
    /// AuthorizationPolicyService
    /// </summary>
    public class AuthorizationPolicyService : IAuthorizationPolicyService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IGitea _giteaApiWrapper;
        private readonly ServiceRepositorySettings _serviceRepositorySettings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="httpClientFactory">IHttpClientFactory</param>
        /// <param name="repositorySettings">IOptions of type ServiceRepositorySettings</param>
        /// <param name="giteaApiWrapper">IGitea</param>
        public AuthorizationPolicyService(
            IHttpClientFactory httpClientFactory,
            IOptions<ServiceRepositorySettings> repositorySettings,
            IGitea giteaApiWrapper)
        {
            _httpClientFactory = httpClientFactory;
            _giteaApiWrapper = giteaApiWrapper;
            _serviceRepositorySettings = repositorySettings.Value;
        }

        /// <inheritdoc />
        public async Task UpdateApplicationAuthorizationPolicyAsync(
            string org,
            string app,
            string fullCommitId,
            EnvironmentModel deploymentEnvironment)
        {
            HttpClient httpClient = GetHttpClientFromHttpClientFactory(deploymentEnvironment);
            string policyFilePath = GetAuthorizationPolicyFilePath(fullCommitId);
            string policyFile = await _giteaApiWrapper.GetFileAsync(org, app, policyFilePath);
            await httpClient.PostAsJsonAsync($"?org={org}&app={app}", policyFile);
        }

        private HttpClient GetHttpClientFromHttpClientFactory(EnvironmentModel deploymentEnvironment)
        {
            HttpClient httpClient = _httpClientFactory.CreateClient(deploymentEnvironment.Hostname);
            string uri = $"https://{deploymentEnvironment.PlatformPrefix}.{deploymentEnvironment.Hostname}/authorization/api/v1/policies/";
            httpClient.BaseAddress = new Uri(uri);
            httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            return httpClient;
        }

        private string GetAuthorizationPolicyFilePath(string fullCommitId)
        {
            const string metadataFolderName = ServiceRepositorySettings.AUTHORIZATION_FOLDER_NAME;
            string authorizationPolicyFileName = _serviceRepositorySettings.AuthorizationPolicyFileName;
            return $"{fullCommitId}/{metadataFolderName}{authorizationPolicyFileName}";
        }
    }
}

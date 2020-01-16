using System;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Infrastructure.Extensions;
using AltinnCore.Designer.Services.Interfaces;
using AltinnCore.Designer.Services.Models;
using AltinnCore.Designer.TypedHttpClients.AltinnAuthorization;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Services
{
    /// <summary>
    /// AuthorizationPolicyService
    /// </summary>
    public class AuthorizationPolicyService : IAuthorizationPolicyService
    {
        private readonly IGitea _giteaApiWrapper;
        private readonly IAltinnAuthorizationPolicyClient _authorizationPolicyClient;
        private readonly ServiceRepositorySettings _serviceRepositorySettings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="repositorySettings">IOptions of type ServiceRepositorySettings</param>
        /// <param name="giteaApiWrapper">IGitea</param>
        /// <param name="authorizationPolicyClient">IAltinnAuthorizationPolicyClient</param>
        public AuthorizationPolicyService(
            IOptions<ServiceRepositorySettings> repositorySettings,
            IGitea giteaApiWrapper,
            IAltinnAuthorizationPolicyClient authorizationPolicyClient)
        {
            _giteaApiWrapper = giteaApiWrapper;
            _authorizationPolicyClient = authorizationPolicyClient;
            _serviceRepositorySettings = repositorySettings.Value;
        }

        /// <inheritdoc />
        public async Task UpdateApplicationAuthorizationPolicyAsync(
            string org,
            string app,
            string shortCommitId,
            EnvironmentModel deploymentEnvironment)
        {
            GiteaFileContent policyFile = await GetAuthorizationPolicyFileFromGitea(org, app, shortCommitId);
            byte[] data = Convert.FromBase64String(policyFile.Content);
            string policyFileContent = Encoding.UTF8.GetString(data);
            await _authorizationPolicyClient.SavePolicy(org, app, policyFileContent, deploymentEnvironment);
        }

        private async Task<GiteaFileContent> GetAuthorizationPolicyFileFromGitea(string org, string app, string shortCommitId)
        {
            string policyFilePath = GetAuthorizationPolicyFilePath();
            return await _giteaApiWrapper.GetFileAsync(org, app, policyFilePath, shortCommitId);
        }

        private string GetAuthorizationPolicyFilePath()
        {
            const string metadataFolderName = ServiceRepositorySettings.AUTHORIZATION_FOLDER_NAME;
            string authorizationPolicyFileName = _serviceRepositorySettings.AuthorizationPolicyFileName;
            return $"{metadataFolderName}{authorizationPolicyFileName}";
        }
    }
}

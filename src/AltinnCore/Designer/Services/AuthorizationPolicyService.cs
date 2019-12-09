using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
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
            string fullCommitId,
            EnvironmentModel deploymentEnvironment)
        {
            string policyFile = await GetAuthorizationPolicyFileFromGitea(org, app, fullCommitId);
            await _authorizationPolicyClient.SavePolicy(org, app, policyFile, deploymentEnvironment);
        }

        private async Task<string> GetAuthorizationPolicyFileFromGitea(string org, string app, string fullCommitId)
        {
            string policyFilePath = GetAuthorizationPolicyFilePath(fullCommitId);
            return await _giteaApiWrapper.GetFileAsync(org, app, policyFilePath);
        }

        private string GetAuthorizationPolicyFilePath(string fullCommitId)
        {
            const string metadataFolderName = ServiceRepositorySettings.AUTHORIZATION_FOLDER_NAME;
            string authorizationPolicyFileName = _serviceRepositorySettings.AuthorizationPolicyFileName;
            return $"{fullCommitId}/{metadataFolderName}{authorizationPolicyFileName}";
        }
    }
}

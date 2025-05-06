using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnAuthorization;

namespace Altinn.Studio.Designer.Services.Implementation
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
        /// <param name="repositorySettings">ServiceRepositorySettings</param>
        /// <param name="giteaApiWrapper">IGitea</param>
        /// <param name="authorizationPolicyClient">IAltinnAuthorizationPolicyClient</param>
        public AuthorizationPolicyService(
            ServiceRepositorySettings repositorySettings,
            IGitea giteaApiWrapper,
            IAltinnAuthorizationPolicyClient authorizationPolicyClient)
        {
            _giteaApiWrapper = giteaApiWrapper;
            _authorizationPolicyClient = authorizationPolicyClient;
            _serviceRepositorySettings = repositorySettings;
        }

        /// <inheritdoc />
        public async Task UpdateApplicationAuthorizationPolicyAsync(
            string org,
            string app,
            string shortCommitId,
            string envName,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            FileSystemObject policyFile = await GetAuthorizationPolicyFileFromGitea(org, app, shortCommitId);
            byte[] data = Convert.FromBase64String(policyFile.Content);
            string policyFileContent = Encoding.UTF8.GetString(data);
            policyFileContent = policyFileContent.Replace("[ORG]", org).Replace("[org]", org).Replace("[APP]", app);
            await _authorizationPolicyClient.SavePolicy(org, app, policyFileContent, envName);
        }

        private async Task<FileSystemObject> GetAuthorizationPolicyFileFromGitea(string org, string app, string shortCommitId)
        {
            string policyFilePath = GetAuthorizationPolicyFilePath();
            return await _giteaApiWrapper.GetFileAsync(org, app, policyFilePath, shortCommitId);
        }

        private string GetAuthorizationPolicyFilePath()
        {
            const string MetadataFolderName = ServiceRepositorySettings.AUTHORIZATION_FOLDER_NAME;
            string authorizationPolicyFileName = _serviceRepositorySettings.AuthorizationPolicyFileName;
            return $"{MetadataFolderName}{authorizationPolicyFileName}";
        }
    }
}

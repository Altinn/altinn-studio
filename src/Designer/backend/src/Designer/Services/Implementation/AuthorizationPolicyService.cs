#nullable disable
using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
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
        private readonly IGiteaClient _giteaClient;
        private readonly IAltinnAuthorizationPolicyClient _authorizationPolicyClient;
        private readonly ServiceRepositorySettings _serviceRepositorySettings;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="repositorySettings">ServiceRepositorySettings</param>
        /// <param name="giteaClient">IGiteaClient</param>
        /// <param name="authorizationPolicyClient">IAltinnAuthorizationPolicyClient</param>
        public AuthorizationPolicyService(
            ServiceRepositorySettings repositorySettings,
            IGiteaClient giteaClient,
            IAltinnAuthorizationPolicyClient authorizationPolicyClient
        )
        {
            _giteaClient = giteaClient;
            _authorizationPolicyClient = authorizationPolicyClient;
            _serviceRepositorySettings = repositorySettings;
        }

        /// <inheritdoc />
        public async Task UpdateApplicationAuthorizationPolicyAsync(
            string org,
            string app,
            string shortCommitId,
            string envName,
            CancellationToken cancellationToken = default
        )
        {
            cancellationToken.ThrowIfCancellationRequested();
            string policyFileContent = await GetAuthorizationPolicyFileFromGitea(org, app, shortCommitId);
            policyFileContent = ReplacePolicyPlaceholderTokens(policyFileContent, org, app);
            await _authorizationPolicyClient.SavePolicy(org, app, policyFileContent, envName);
        }

        public async Task<string> GetAuthorizationPolicyFileFromGitea(string org, string app, string shortCommitId)
        {
            string policyFilePath = GetAuthorizationPolicyFilePath();
            FileSystemObject policyFile = await _giteaClient.GetFileAsync(org, app, policyFilePath, shortCommitId);
            byte[] data = Convert.FromBase64String(policyFile.Content);
            return Encoding.UTF8.GetString(data);
        }

        public string ReplacePolicyPlaceholderTokens(string policyFileContent, string org, string app)
        {
            return policyFileContent
                .Replace("[ORG]", org)
                .Replace("[org]", org)
                .Replace("[APP]", app)
                .Replace("[app]", app);
        }

        private string GetAuthorizationPolicyFilePath()
        {
            const string MetadataFolderName = ServiceRepositorySettings.AUTHORIZATION_FOLDER_NAME;
            string authorizationPolicyFileName = _serviceRepositorySettings.AuthorizationPolicyFileName;
            return $"{MetadataFolderName}{authorizationPolicyFileName}";
        }
    }
}

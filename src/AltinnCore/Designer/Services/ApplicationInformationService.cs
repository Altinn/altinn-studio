using System.Collections.Generic;
using System.Threading.Tasks;
using AltinnCore.Common.Models;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Services.Interfaces;
using AltinnCore.Designer.Services.Models;

namespace AltinnCore.Designer.Services
{
    /// <summary>
    /// ApplicationInformationService
    /// </summary>
    public class ApplicationInformationService : IApplicationInformationService
    {
        private readonly IApplicationMetadataService _applicationMetadataService;
        private readonly IAuthorizationPolicyService _authorizationPolicyService;
        private readonly IGitea _giteaApiWrapper;

        /// <summary>
        /// Constructor
        /// </summary>
        public ApplicationInformationService(
            IApplicationMetadataService applicationMetadataService,
            IAuthorizationPolicyService authorizationPolicyService,
            IGitea giteaApiWrapper)
        {
            _applicationMetadataService = applicationMetadataService;
            _authorizationPolicyService = authorizationPolicyService;
            _giteaApiWrapper = giteaApiWrapper;
        }

        /// <inheritdoc />
        public async Task UpdateApplicationInformationAsync(
            string org,
            string app,
            string commitId,
            EnvironmentModel deploymentEnvironment)
        {
            GitTreeStructure gitTree = await _giteaApiWrapper.GetGitTreeAsync(org, app, commitId);
            string fullCommitSha = gitTree.Sha;

            Task updateMetadataTask = _applicationMetadataService
                .UpdateApplicationMetadataAsync(org, app, fullCommitSha, deploymentEnvironment);

            Task updateAuthPolicyTask = _authorizationPolicyService
                .UpdateApplicationAuthorizationPolicyAsync(org, app, fullCommitSha, deploymentEnvironment);

            await Task.WhenAll(new List<Task>
            {
                updateMetadataTask,
                updateAuthPolicyTask
            });
        }
    }
}

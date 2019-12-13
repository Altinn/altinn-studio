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
            string shortCommitId,
            EnvironmentModel deploymentEnvironment)
        {
            Task updateMetadataTask = _applicationMetadataService
                .UpdateApplicationMetadataAsync(org, app, shortCommitId, deploymentEnvironment);

            Task updateAuthPolicyTask = _authorizationPolicyService
                .UpdateApplicationAuthorizationPolicyAsync(org, app, shortCommitId, deploymentEnvironment);

            await Task.WhenAll(new List<Task>
            {
                updateMetadataTask,
                updateAuthPolicyTask
            });
        }
    }
}

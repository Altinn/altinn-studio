using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.Services.Implementation
{
    /// <summary>
    /// ApplicationInformationService
    /// </summary>
    public class ApplicationInformationService : IApplicationInformationService
    {
        private readonly IApplicationMetadataService _applicationMetadataService;
        private readonly IAuthorizationPolicyService _authorizationPolicyService;
        private readonly ITextResourceService _textResourceService;
        private readonly IGitea _giteaApiWrapper;

        /// <summary>
        /// Constructor
        /// </summary>
        public ApplicationInformationService(
            IApplicationMetadataService applicationMetadataService,
            IAuthorizationPolicyService authorizationPolicyService,
            ITextResourceService textResourceService,
            IGitea giteaApiWrapper)
        {
            _applicationMetadataService = applicationMetadataService;
            _authorizationPolicyService = authorizationPolicyService;
            _textResourceService = textResourceService;
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

            Task updateTextResources = _textResourceService
                .UpdateTextResourcesAsync(org, app, shortCommitId, deploymentEnvironment);

            await Task.WhenAll(new List<Task>
            {
                updateMetadataTask,
                updateAuthPolicyTask,
                updateTextResources
            });
        }
    }
}

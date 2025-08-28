using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Services.Interfaces;

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

        /// <summary>
        /// Constructor
        /// </summary>
        public ApplicationInformationService(
            IApplicationMetadataService applicationMetadataService,
            IAuthorizationPolicyService authorizationPolicyService,
            ITextResourceService textResourceService)
        {
            _applicationMetadataService = applicationMetadataService;
            _authorizationPolicyService = authorizationPolicyService;
            _textResourceService = textResourceService;
        }

        /// <inheritdoc />
        public async Task UpdateApplicationInformationAsync(
            string org,
            string app,
            string shortCommitId,
            string envName,
            CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await _applicationMetadataService
                .UpdateApplicationMetadataInStorageAsync(org, app, shortCommitId, envName, cancellationToken);

            Task updateAuthPolicyTask = _authorizationPolicyService
                .UpdateApplicationAuthorizationPolicyAsync(org, app, shortCommitId, envName, cancellationToken);

            Task updateTextResources = _textResourceService
                .UpdateTextResourcesAsync(org, app, shortCommitId, envName, cancellationToken);

            await Task.WhenAll(new List<Task>
            {
                updateAuthPolicyTask,
                updateTextResources
            });
        }
    }
}

using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.ModelBinding.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.FeatureManagement.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller for syncing GitOps configuration for an organization's environment
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("/designer/api/v1/{org}/sync-gitops")]
    public class AppsSyncRootController : ControllerBase
    {
        private readonly IDeploymentService _deploymentService;

        public AppsSyncRootController(IDeploymentService deploymentService)
        {
            _deploymentService = deploymentService;
        }

        /// <summary>
        /// Publishes the sync-root GitOps OCI image to the container registry.
        /// This triggers a pipeline that pushes the GitOps configuration for an org's environment.
        /// It's get method on purpose to allow triggering from browser.
        /// </summary>
        /// <param name="org">Organisation name</param>
        /// <param name="environment">Target environment</param>
        /// <param name="cancellationToken">Cancellation token to abort the operation</param>
        /// <returns>Accepted response when pipeline is queued</returns>
        [HttpGet("{environment}/push")]
        [Authorize(Policy = AltinnPolicy.MustHaveGiteaDeployPermission)]
        [FeatureGate(StudioFeatureFlags.GitOpsDeploy)]
        public async Task<IActionResult> PublishSyncRoot(string org, string environment, CancellationToken cancellationToken)
        {
            var editingContext = AltinnOrgEditingContext.FromOrgDeveloper(org, AuthenticationHelper.GetDeveloperUserName(HttpContext));
            await _deploymentService.PublishSyncRootAsync(editingContext, AltinnEnvironment.FromName(environment), cancellationToken);

            return Accepted();
        }
    }
}

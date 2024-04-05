using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller for getting kubernetes deployments
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/kubernetesDeployments")]
    public class KubernetesDeploymentsController : ControllerBase
    {
        private readonly IKubernetesDeploymentsService _kubernetesDeploymentsService;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="kubernetesDeploymentsService">IKubernetesDeploymentsService</param>
        public KubernetesDeploymentsController(IKubernetesDeploymentsService kubernetesDeploymentsService)
        {
            _kubernetesDeploymentsService = kubernetesDeploymentsService;
        }

        /// <summary>
        /// Gets kubernetes deployments
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application name</param>
        /// <returns>List of kubernetes deployments</returns>
        [HttpGet]
        [ApiConventionMethod(typeof(DefaultApiConventions), nameof(DefaultApiConventions.Get))]
        public async Task<List<KubernetesDeployment>> Get(string org, string app)
        {
            return await _kubernetesDeploymentsService.GetAsync(org, app);
        }
    }
}

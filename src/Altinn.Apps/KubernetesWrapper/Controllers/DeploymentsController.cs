using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers
{
    [Route("apis/apps/v1/[controller]")]
    [ApiController]
    public class DeploymentsController : ControllerBase
    {

        private readonly IKubernetesAPIWrapper _apiWrapper;

        public DeploymentsController(IKubernetesAPIWrapper apiWrapper)
        {
            _apiWrapper = apiWrapper;
        }

        // GET /apis/apps/v1/deployments
        [HttpGet]
        public Task<k8s.Models.V1DeploymentList> GetDeployments(string continueParameter, string labelSelector, string fieldSelector)
        {
            return _apiWrapper.GetDeployments(continueParameter, fieldSelector, labelSelector);
        }
    }
}

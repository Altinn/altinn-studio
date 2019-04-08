using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using KubernetesWrapper.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace KubernetesWrapper.Controllers
{
    [Route("/[controller]")]
    [ApiController]
    public class DeploymentsController : ControllerBase
    {

        private readonly IKubernetesAPIWrapper _apiWrapper;

        public DeploymentsController(IKubernetesAPIWrapper apiWrapper)
        {
            _apiWrapper = apiWrapper;
        }

        // GET /deployments
        [HttpGet]
        [EnableCors]
        public async Task<ActionResult> GetDeployments(string continueParameter, string labelSelector, string fieldSelector)
        {
            try
            {
                var deployments = await _apiWrapper.GetDeployments(continueParameter, fieldSelector, labelSelector);
                return Ok(deployments.Items);
            }
            catch (Exception e)
            {
                return StatusCode(500, e.Message);
            }
        }
    }
}

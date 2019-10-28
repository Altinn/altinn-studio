using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Authorization.Controllers
{
    /// <summary>
    /// Contains all actions related to managing authorization rules
    /// </summary>
    [Route("authorization/api/v1/policies")]
    [ApiController]
    public class PolicyController : ControllerBase
    {
        private readonly IPolicyRetrievalPoint _prp;

        /// <summary>
        /// Initializes a new instance of the <see cref="PolicyController"/> class.      
        /// </summary>
        /// <param name="prp">The policy retrieval point.</param>
        public PolicyController(IPolicyRetrievalPoint prp)
        {
            _prp = prp;
        }

        [HttpGet]
        public async Task<XacmlPolicy> GetPolicy(XacmlContextRequest request)
        {
            XacmlPolicy policy = await _prp.GetPolicyAsync(request);
            return policy;
        }

        [HttpPost]
        public async Task<bool> WritePolicy([FromQuery] string org, [FromQuery] string app)
        {
            throw new NotImplementedException();
        }

        [HttpPut("{org}/{app}")]
        public async Task<bool> UpdatePolicy([FromQuery] string org, [FromQuery] string app)
        {
            throw new NotImplementedException();
        }
    }
}

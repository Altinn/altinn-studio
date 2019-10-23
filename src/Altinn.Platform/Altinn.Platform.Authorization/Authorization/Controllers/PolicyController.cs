using Altinn.Authorization.ABAC.Interface;
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
    }
}

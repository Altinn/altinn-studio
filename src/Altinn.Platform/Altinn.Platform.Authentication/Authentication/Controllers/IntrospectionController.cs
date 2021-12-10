using System.Threading.Tasks;

using Altinn.Platform.Authentication.Model;
using Altinn.Platform.Authentication.Services.Interfaces;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Authentication.Controllers
{
    /// <summary>
    /// Controller for introspection requests to Platform Authentication
    /// </summary>
    [Route("authentication/api/v1/introspection")]
    [ApiController]
    public class IntrospectionController : ControllerBase
    {
        private readonly IEFormidlingAccessValidator _eFormidlingAccessValidator;

        /// <summary>
        /// Initializes a new instance of the <see cref="IntrospectionController"/> class.
        /// </summary>
        /// <param name="eFormidlingAccessValidator">The eFormidling access validator service</param>
        public IntrospectionController(IEFormidlingAccessValidator eFormidlingAccessValidator)
        {
            _eFormidlingAccessValidator = eFormidlingAccessValidator;
        }

        /// <summary>
        /// Validate token.
        /// </summary>
        [AllowAnonymous]
        [HttpPost]
        [Produces("application/json")]
        [Consumes("application/x-www-form-urlencoded")]
        [ProducesResponseType(typeof(IntrospectionResponse), StatusCodes.Status200OK)]
        public async Task<ActionResult<IntrospectionResponse>> ValidateToken([FromForm] IntrospectionRequest request)
        {
            IntrospectionResponse response = new();
            string token = request.Token;

            switch (request.TokenTypeHint)
            {
                case "eFormidlingAccessToken":
                default:
                    // default behavior must try to  validate against all supported token types
                    response = await ValidateEFormidlingAccessToken(token);
                    break;
            }

            return Ok(response);
        }

        private async Task<IntrospectionResponse> ValidateEFormidlingAccessToken(string token)
        {
            return await _eFormidlingAccessValidator.ValidateToken(token);
        }
    }
}

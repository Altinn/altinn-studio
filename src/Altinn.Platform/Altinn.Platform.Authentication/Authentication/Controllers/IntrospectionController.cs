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
    [Authorize]
    [Route("authentication/api/v1/introspection")]
    [ApiController]
    public class IntrospectionController : ControllerBase
    {
        private readonly IAuthentication _authentication;

        /// <summary>
        /// Initializes a new instance of the <see cref="IntrospectionController"/> class.
        /// </summary>
        public IntrospectionController(IAuthentication authentication)
        {
            _authentication = authentication;
        }

        /// <summary>
        /// Validates provided token.
        /// </summary>
        [HttpPost]
        [Produces("application/json")]
        [Consumes("application/x-www-form-urlencoded")]
        [ProducesResponseType(typeof(IntrospectionResponse), StatusCodes.Status200OK)]
        public async Task<ActionResult<IntrospectionResponse>> ValidateToken([FromForm] IntrospectionRequest request)
        {
            if (string.IsNullOrEmpty(request.Token))
            {
                return BadRequest("Token canot be empty.");
            }

            var response = await _authentication.IntrospectionValidation(request);

            return Ok(response);
        }
    }
}

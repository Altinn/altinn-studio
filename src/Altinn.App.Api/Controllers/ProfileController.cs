using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Controller that exposes profile
    /// </summary>
    [Authorize]
    [Route("{org}/{app}/api/v1/profile")]
    [ApiController]
    public class ProfileController : Controller
    {
        private readonly IProfileClient _profileClient;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileController"/> class
        /// </summary>
        public ProfileController(IProfileClient profileClient, ILogger<ProfileController> logger)
        {
            _profileClient = profileClient;
            _logger = logger;
        }

        /// <summary>
        /// Method that returns the user information about the user that is logged in
        /// </summary>
        [Authorize]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        [HttpGet("user")]
        public async Task<ActionResult> GetUser()
        {
            int userId = AuthenticationHelper.GetUserId(HttpContext);
            if (userId == 0)
            {
                return BadRequest("The userId is not proviced in the context.");
            }

            try
            {
                var user = await _profileClient.GetUserProfile(userId);

                if (user == null)
                {
                    return NotFound();
                }

                return Ok(user);
            }
            catch (Exception e)
            {
                return StatusCode(500, e.Message);
            }
        }
    }
}

using System;
using System.Threading.Tasks;
using Altinn.App.Services.Helpers;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

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
        private readonly IProfile _profileClient;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileController"/> class
        /// </summary>
        public ProfileController(IProfile profileClient, IHttpContextAccessor httpContextAccessor, ILogger<ProfileController> logger)
        {
            _profileClient = profileClient;
            _httpContextAccessor = httpContextAccessor;
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
            int userId = AuthenticationHelper.GetUserId(_httpContextAccessor.HttpContext);
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

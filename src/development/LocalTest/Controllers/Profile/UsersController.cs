using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Services.Models;
using AltinnCore.Authentication.Constants;
using LocalTest.Services.Profile.Interface;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Profile.Controllers
{
    /// <summary>
    /// The users controller
    /// </summary>
    [Route("profile/api/v1/[controller]")]
    public class UsersController : Controller
    {
        private readonly IUserProfiles _userProfilesWrapper;

        /// <summary>
        /// Initializes a new instance of the <see cref="UsersController"/> class
        /// </summary>
        /// <param name="userProfilesWrapper">The users wrapper</param>
        public UsersController(IUserProfiles userProfilesWrapper)
        {
            _userProfilesWrapper = userProfilesWrapper;
        }

        /// <summary>
        /// Gets the user profile for a given user id
        /// </summary>
        /// <param name="userID">The party id</param>
        /// <returns>The information about a given user</returns>
        [HttpGet("{userID}")]
        public async Task<ActionResult> Get(int userID)
        {
            UserProfile result = await _userProfilesWrapper.GetUser(userID);
            if (result == null)
            {
                return NotFound();
            }

            return Ok(result);
        }

        /// <summary>
        /// Gets the current user based on the request context
        /// </summary>
        /// <returns>User profile of current user</returns>
        [HttpGet("current")]
        public async Task<ActionResult> Get()
        {
            string userIdString = Request.HttpContext.User.Claims.Where(c => c.Type == AltinnCoreClaimTypes.UserId)
           .Select(c => c.Value).SingleOrDefault();

            if (string.IsNullOrEmpty(userIdString))
            {
                return BadRequest("Invalid request context. UserId must be provided in claims.");
            }

            int userId = int.Parse(userIdString);

            return await Get(userId);
        }
    }
}

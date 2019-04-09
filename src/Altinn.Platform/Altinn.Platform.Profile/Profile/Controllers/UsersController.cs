using System.Threading.Tasks;
using Altinn.Platform.Profile.Services.Interfaces;
using AltinnCore.ServiceLibrary;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Platform.Profile.Controllers
{
    /// <summary>
    /// The users controller
    /// </summary>
    [Route("api/v1/[controller]")]
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
    }
}

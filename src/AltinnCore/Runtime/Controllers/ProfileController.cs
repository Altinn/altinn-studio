using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Helpers;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// Controller that exposes profile
    /// </summary>
    [Authorize]
    public class ProfileController : Controller
    {
        private readonly IProfile _profile;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of the <see cref="ProfileController"/> class
        /// </summary>
        /// <param name="profile">The profile service</param>
        /// <param name="httpContextAccessor">the http context accessor</param>
        public ProfileController(IProfile profile, IHttpContextAccessor httpContextAccessor)
        {
            _profile = profile;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Method that returns the user information about the user that is logged in
        /// </summary>
        public async Task<ActionResult> GetUser()
        {
            int userId = AuthenticationHelper.GetUserId(_httpContextAccessor.HttpContext);
            UserProfile user = null;
            if (userId != 0)
            {
                user = await _profile.GetUserProfile(userId);
            }

            if (userId == 0 || user == null)
            {
                return NotFound();
            }

            return Ok(user);
        }
    }
}

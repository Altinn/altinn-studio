using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AltinnCore.Designer.Controllers
{
    /// <summary>
    /// API controller for User functionality
    /// </summary>
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IGitea _giteaApi;
        private readonly ServiceRepositorySettings _settings;
        private readonly IAntiforgery _antiforgery;

        /// <summary>
        /// Initializes a new instance of the <see cref="UserController"/> class.
        /// </summary>
        /// <param name="giteaWrapper">the gitea wrapper</param>
        /// <param name="repositorySettings">Settings for repository</param>
        /// <param name="antiforgery">Access to the antiforgery system in .NET Core</param>
        public UserController(IGitea giteaWrapper, IOptions<ServiceRepositorySettings> repositorySettings, IAntiforgery antiforgery)
        {
            _giteaApi = giteaWrapper;
            _settings = repositorySettings.Value;
            _antiforgery = antiforgery;
        }

        /// <summary>
        /// Returns current logged in user
        /// </summary>
        /// <returns>The user object</returns>
        [HttpGet]
        public async Task<AltinnCore.RepositoryClient.Model.User> Current()
        {
            // See comments in the configuration of Antiforgery in MvcConfiguration.cs.
            var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
            HttpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken, new CookieOptions
            {
                HttpOnly = false // Make this cookie readable by Javascript.
            });

            return await _giteaApi.GetCurrentUser();
        }
    }
}

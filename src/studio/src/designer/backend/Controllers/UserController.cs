using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// API controller for User functionality
    /// </summary>
    [Authorize]
    [Route("designer/api/v1/user")]
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
        [Route("current")]
        public async Task<RepositoryClient.Model.User> Current()
        {
            // See comments in the configuration of Antiforgery in MvcConfiguration.cs.
            var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
            HttpContext.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken, new CookieOptions
            {
                HttpOnly = false // Make this cookie readable by Javascript.
            });

            return await _giteaApi.GetCurrentUser();
        }

        /// <summary>
        /// Gets all starred repositories for the logged in user.
        /// </summary>
        /// <returns>A <see cref="Task{TResult}"/> representing the result of the asynchronous operation.</returns>
        [HttpGet]
        [Route("starred")]
        public async Task<IList<Designer.RepositoryClient.Model.Repository>> GetStarredRepos()
        {
            return await _giteaApi.GetStarred();

        }
    }
}

using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// API controller for User functionality
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("designer/api/user")]
    public class UserController : ControllerBase
    {
        private readonly IGitea _giteaApi;
        private readonly IAntiforgery _antiforgery;
        private readonly IUserService _userService;

        /// <summary>
        /// Initializes a new instance of the <see cref="UserController"/> class.
        /// </summary>
        /// <param name="giteaWrapper">the gitea wrapper</param>
        /// <param name="antiforgery">Access to the antiforgery system in .NET Core</param>
        /// <param name="userService">User service</param>
        public UserController(IGitea giteaWrapper, IAntiforgery antiforgery, IUserService userService)
        {
            _giteaApi = giteaWrapper;
            _antiforgery = antiforgery;
            _userService = userService;
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
        /// List the repos that the authenticated user owns or has access to
        /// </summary>
        /// <returns>List of repos</returns>
        [HttpGet]
        [Route("repos")]
        public Task<IList<RepositoryClient.Model.Repository>> UserRepos()
        {
            return _giteaApi.GetUserRepos();
        }

        /// <summary>
        /// Gets all starred repositories for the logged in user.
        /// </summary>
        /// <returns>An array of repositores that the user has starred</returns>
        [HttpGet]
        [Route("starred")]
        public async Task<IList<RepositoryClient.Model.Repository>> GetStarredRepos()
        {
            return await _giteaApi.GetStarred();
        }

        /// <summary>
        /// Adds the repository to the users list of starred repositories.
        /// </summary>
        [HttpPut]
        [Route("starred/{org}/{repository}")]
        public async Task<IActionResult> PutStarred(string org, string repository)
        {
            var success = await _giteaApi.PutStarred(org, repository);
            return success ? NoContent() : StatusCode(418);
        }

        [HttpGet]
        [Route("org-permissions/{org}")]
        public async Task<IActionResult> HasAccessToCreateRepository(string org)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnOrgContext editingContext = AltinnOrgContext.FromOrg(org, developer);
            UserOrgPermission userOrg = await _userService.GetUserOrgPermission(editingContext);
            return Ok(userOrg);
        }

        /// <summary>
        /// Removes the star marking on the specified repository.
        /// </summary>
        [HttpDelete]
        [Route("starred/{org}/{repository}")]
        public async Task<IActionResult> DeleteStarred(string org, string repository)
        {
            var success = await _giteaApi.DeleteStarred(org, repository);
            return success ? NoContent() : StatusCode(418);
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
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

        /// <summary>
        /// Initializes a new instance of the <see cref="UserController"/> class.
        /// </summary>
        /// <param name="giteaWrapper">the gitea wrapper</param>
        /// <param name="repositorySettings">Settings for repository</param>
        public UserController(IGitea giteaWrapper, IOptions<ServiceRepositorySettings> repositorySettings)
        {
            _giteaApi = giteaWrapper;
            _settings = repositorySettings.Value;
        }

        /// <summary>
        /// Returns current logged in user
        /// </summary>
        /// <returns>The user object</returns>
        [HttpGet]
        public AltinnCore.RepositoryClient.Model.User Current()
        {
            string sessionId = Request.Cookies[_settings.GiteaCookieName];
            AltinnCore.RepositoryClient.Model.User user = _giteaApi.GetCurrentUser(sessionId).Result;
            return user;
        }
    }
}

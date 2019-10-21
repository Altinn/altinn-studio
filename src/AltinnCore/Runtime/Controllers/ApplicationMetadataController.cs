using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Helpers;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.RepositoryClient.Model;
using AltinnCore.ServiceLibrary.Enums;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Common.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ServiceLibrary.Models;

namespace AltinnCore.Runtime.Controllers
{
    /// <summary>
    /// Hanldes application metadata
    /// </summary>
    [Authorize]
    [ApiController]
    public class ApplicationMetadataController: ControllerBase
    {
        private readonly ILogger _logger;
        private readonly IAuthorization _authorization;
        private readonly IApplication _application;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationMetadataController"/> class
        /// <param name="logger">The logger</param>
        /// <param name="authorization">the authorization service handler</param>
        /// <param name="repository">The repository service</param>
        /// </summary>
        public ApplicationMetadataController(
            ILogger<ApplicationMetadataController> logger,
            IAuthorization authorization,
            IApplication application)
        {
            _logger = logger;
            _authorization = authorization;
            _application = application;
        }

        /// <summary>
        /// Get the application metadata
        /// </summary>
        /// <param name="org">The organization</param>
        /// <param name="app">The application</param>
        /// <returns>Application metadata</returns>
        [HttpGet("{org}/{app}/api/v1/applicationmetadata")]
        public async Task<IActionResult> GetAction(string org, string app)
        {
            Application application = await _application.GetApplication(org, app);
            return Ok(application);
        }
    }
}

﻿using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Represents the Application language API giving access to the different languages supported by the application.
    /// </summary>
    [Route("{org}/{app}/api/v1/applicationlanguages")]
    [Authorize]
    public class ApplicationLanguageController : ControllerBase
    {
        private readonly IApplicationLanguage _applicationLanguage;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationLanguageController"/> class.
        /// </summary>
        /// <param name="applicationLanguage">An implementation with access to application languages.</param>
        /// <param name="logger">The logger.</param>
        public ApplicationLanguageController(IApplicationLanguage applicationLanguage, ILogger<ApplicationLanguageController> logger)
        {
            _applicationLanguage = applicationLanguage;
            _logger = logger;
        }

        /// <summary>
        /// Method to retrieve the supported languages from the application.
        /// </summary>
        /// <returns>Returns a list of ApplicationLanguages.</returns>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<List<ApplicationLanguage>>> GetLanguages()
        {
            try
            {
                return await _applicationLanguage.GetApplicationLanguages();
            }
            catch (DirectoryNotFoundException)
            {
                _logger.LogWarning("Something went wrong while trying to fetch the application language");
                return NotFound();
            }
        }
    }
}

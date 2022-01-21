using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Options;
using Altinn.App.Services.Interface;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Represents the Options API.
    /// </summary>
    [Route("{org}/{app}/api/options")]
    [ApiController]
    public class OptionsController : ControllerBase
    {
        private readonly IAltinnApp _altinnApp;
        private readonly IAppOptionsService _appOptionsService;

        /// <summary>
        /// Initializes a new instance of the <see cref="OptionsController"/> class.
        /// </summary>
        /// <param name="altinnApp">The current App Core used to interface with custom logic</param>
        /// <param name="appOptionsService">Service for handling app options</param>
        public OptionsController(IAltinnApp altinnApp, IAppOptionsService appOptionsService)
        {
            _altinnApp = altinnApp;
            _appOptionsService = appOptionsService;
        }

        /// <summary>
        /// Api that exposes app related options
        /// </summary>
        /// <param name="optionsId">The optionsId</param>
        /// <param name="language">The language selected by the user.</param>
        /// <param name="queryParams">Query parameteres supplied</param>
        /// <returns>The options list</returns>
        [HttpGet("{optionsId}")]
        public async Task<IActionResult> Get(
            [FromRoute] string optionsId,
            [FromQuery] string language,
            [FromQuery] Dictionary<string, string> queryParams)
        {
            AppOptions appOptions = await _appOptionsService.GetOptionsAsync(optionsId, language, queryParams);

            // Kept for backwards compatibility, but should use the IAppOptionsProvider instead.
#pragma warning disable CS0618 // Type or member is obsolete
            appOptions = await _altinnApp.GetOptions(optionsId, appOptions);
#pragma warning restore CS0618 // Type or member is obsolete

            if (appOptions.Options == null || appOptions.Options.Count == 0)
            {
                return NotFound();
            }

            return Ok(appOptions.Options);
        }
    }
}

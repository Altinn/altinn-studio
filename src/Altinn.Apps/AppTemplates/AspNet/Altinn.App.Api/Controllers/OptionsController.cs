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
        private readonly AppOptionsFactory _appOptionsFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="OptionsController"/> class.
        /// </summary>
        /// <param name="altinnApp">The current App Core used to interface with custom logic</param>
        /// <param name="appOptionsFactory">Factory class for resolving the <see cref="IAppOptionsProvider"/> implementation to use.</param>
        public OptionsController(IAltinnApp altinnApp, AppOptionsFactory appOptionsFactory)
        {
            _altinnApp = altinnApp;
            _appOptionsFactory = appOptionsFactory;
        }

        /// <summary>
        /// Api that exposes app related options
        /// </summary>
        /// <param name="optionsId">The optionsId</param>
        /// <param name="queryParams">Query parameteres supplied</param>
        /// <returns>The options list</returns>
        [HttpGet("{optionsId}")]
        public async Task<IActionResult> Get(
            [FromRoute] string optionsId,
            [FromQuery] Dictionary<string, string> queryParams)
        {
            AppOptions appOptions = await _appOptionsFactory.GetOptionsProvider(optionsId).GetAppOptionsAsync(queryParams);

            // Kept for backwards compatibility, but should use the IAppOptionsProvider instead.
            appOptions = await _altinnApp.GetOptions(optionsId, appOptions);

            if (appOptions.Options == null || appOptions.Options.Count == 0)
            {
                return NotFound();
            }

            return Ok(appOptions.Options);
        }
    }
}

using System.Threading.Tasks;
using Altinn.App.Common.Models;
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
        private readonly IAppResources _appResourceService;

        /// <summary>
        /// Initializes a new instance of the <see cref="OptionsController"/> class.
        /// </summary>
        /// <param name="altinnApp">The current App Core used to interface with custom logic</param>
        /// <param name="appResourcesService">A service with access to local resources.</param>
        public OptionsController(IAltinnApp altinnApp, IAppResources appResourcesService)
        {
            _altinnApp = altinnApp;
            _appResourceService = appResourcesService;
        }

        /// <summary>
        /// Api that exposes app related options
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="app">The app</param>
        /// <param name="optionsId">The optionsId</param>
        /// <returns>The options list</returns>
        [HttpGet("{optionsId}")]
        public async Task<IActionResult> Get(
            [FromRoute] string org,
            [FromRoute] string app,
            [FromRoute] string optionsId)
        {
            // Create containers 
            AppOptions appOptions = new AppOptions();

            // TODO
            // Add code to identify standard options that can be retrieved from platform.

            // Get options from configuration 
            appOptions.Options = _appResourceService.GetOptions(optionsId);

            appOptions = await _altinnApp.GetOptions(optionsId, appOptions);

            if (appOptions.Options == null || appOptions.Options.Count == 0)
            {
                return NotFound();
            }

            return Ok(appOptions.Options);
        }
    }
}

using System.Threading.Tasks;

using Altinn.App.Services.Interface;
using Altinn.Platform.Storage.Interface.Models;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Represents the Text resources API giving access to texts in different languages.
    /// </summary>
    [Route("{org}/{app}/api/v1/texts/{language}")]
    [Authorize]
    public class TextsController : ControllerBase
    {
        private readonly IAppResources _appResources;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextsController"/> class.
        /// </summary>
        /// <param name="appResources">A service with access to text resources.</param>
        public TextsController(IAppResources appResources)
        {
            _appResources = appResources;
        }

        /// <summary>
        /// Method to retrieve text resources
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="language">The text language to use.</param>
        /// <returns>The text resource file content or 404</returns>
        [HttpGet]
        public async Task<ActionResult<TextResource>> Get(string org, string app, [FromRoute] string language)
        {
            if (!string.IsNullOrEmpty(language) && language.Length != 2)
            {
                return BadRequest($"Provided language {language} is invalid. Language code should consists of two characters.");
            }

            TextResource textResource = _appResources.GetTexts(org, app, language);

            if (textResource == null && language != "nb")
            {
                textResource = _appResources.GetTexts(org, app, "nb");
            }

            if (textResource == null)
            {
                return NotFound();
            }

            return await Task.FromResult(textResource);
        }
    }
}

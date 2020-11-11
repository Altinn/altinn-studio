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
        private readonly IText _text;

        /// <summary>
        /// Initializes a new instance of the <see cref="TextsController"/> class.
        /// </summary>
        /// <param name="text">A service with access to text resources.</param>
        public TextsController(IText text)
        {
            _text = text;
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
            TextResource textResource;

            if (!string.IsNullOrEmpty(language) && language.Length != 2)
            {
                return BadRequest($"Provided language {language} is invalid. Language code should consists of two characters.");
            }

            textResource = await _text.GetText(org, app, language);
            if (textResource != null)
            {
                return textResource;
            }

            // using default language if requested language doesn't exist
            textResource = await _text.GetText(org, app, "nb");
            if (textResource != null)
            {
                return textResource;
            }

            return NotFound();
        }
    }
}

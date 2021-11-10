using System;
using System.ComponentModel.DataAnnotations;
using Altinn.App.Api.Filters;
using Altinn.App.Services.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers
{
    /// <summary>
    /// Controller for redirect and validation of URL
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryTokenIfAuthCookie]
    [Route("{org}/{app}/api/v1/redirect")]
    [ApiController]
    public class RedirectController : ControllerBase
    {
        private readonly AppSettings _appSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="RedirectController"/> class.
        /// </summary>
        /// <param name="appSettings">The app settings.</param>
        public RedirectController(IOptions<AppSettings> appSettings)
        {
            _appSettings = appSettings.Value;
        }

        /// <summary>
        /// Validates URL used for redirection
        /// </summary>
        /// <param name="url">URL to validate</param>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public ActionResult ValidateUrl([BindRequired, FromQuery, Url] string url)
        {
            Uri uri = new Uri(url);

            if (_appSettings.Hostname != uri.Host)
            {
                string errorMessage = $"Invalid domain from query parameter {nameof(url)}.";
                ModelState.AddModelError(nameof(url), errorMessage);
                return ValidationProblem();
            }

            return Ok();
        }
    }
}

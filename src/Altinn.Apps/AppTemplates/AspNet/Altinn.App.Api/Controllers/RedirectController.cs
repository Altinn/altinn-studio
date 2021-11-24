using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;

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
        private readonly GeneralSettings _settings;

        /// <summary>
        /// Initializes a new instance of the <see cref="RedirectController"/> class.
        /// </summary>
        /// <param name="settings">The general settings.</param>
        public RedirectController(IOptions<GeneralSettings> settings)
        {
            _settings = settings.Value;
        }

        /// <summary>
        /// Validates URL used for redirection
        /// </summary>
        /// <param name="url">URL to validate</param>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public ActionResult<string> ValidateUrl([BindRequired, FromQuery, Url] string url)
        {
            Uri uri = new Uri(url);

            if (!IsValidRedirectUri(uri.Host))
            {
                string errorMessage = $"Invalid domain from query parameter {nameof(url)}.";
                ModelState.AddModelError(nameof(url), errorMessage);
                return ValidationProblem();
            }

            return Ok(url);
        }

        private bool IsValidRedirectUri(string urlHost)
        {
            string validHost = _settings.HostName;
            int segments = _settings.HostName.Split('.').Length;

            List<string> goToList = Enumerable.Reverse(new List<string>(urlHost.Split('.'))).Take(segments).Reverse().ToList();
            string redirectHost = string.Join(".", goToList);

            return validHost.Equals(redirectHost);
        }
    }
}

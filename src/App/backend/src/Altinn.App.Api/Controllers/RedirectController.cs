using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Features.Redirect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for redirect and validation of URL
/// </summary>
[AllowAnonymous]
[AutoValidateAntiforgeryTokenIfAuthCookie]
[Route("{org}/{app}/api/v1/redirect")]
[ApiController]
internal sealed class RedirectController(IRedirectUrlValidator redirectUrlValidator) : ControllerBase
{
    /// <summary>
    /// Validates URL used for redirection
    /// </summary>
    /// <param name="url">Base64 encoded string of the URL to validate</param>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<string> ValidateUrl([BindRequired, FromQuery] string url)
    {
        var result = redirectUrlValidator.Validate(url);

        if (result.IsValid)
        {
            return Ok(result.DecodedUrl);
        }

        if (result.IsInvalidDomain)
        {
            ModelState.AddModelError(nameof(url), result.ErrorMessage);
            return ValidationProblem();
        }

        return BadRequest(result.ErrorMessage);
    }
}

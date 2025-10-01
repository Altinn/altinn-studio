#nullable disable
using System.Text;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller for redirect and validation of URL
/// </summary>
[AllowAnonymous]
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
    /// <param name="url">Base64 encoded string of the URL to validate</param>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<string> ValidateUrl([BindRequired, FromQuery] string url)
    {
        if (string.IsNullOrEmpty(url))
        {
            return BadRequest(
                $"Invalid value of query parameter {nameof(url)}. The query parameter {nameof(url)} must not be empty or null."
            );
        }

        try
        {
            var byteArrayUri = Convert.FromBase64String(url);
            var convertedUri = Encoding.UTF8.GetString(byteArrayUri);
            Uri uri = new Uri(convertedUri);

            if (!IsValidRedirectUri(uri.Host))
            {
                string errorMessage = $"Invalid domain from query parameter {nameof(url)}.";
                ModelState.AddModelError(nameof(url), errorMessage);
                return ValidationProblem();
            }

            return Ok(convertedUri);
        }
        catch (FormatException)
        {
            return BadRequest(
                $"Invalid format of query parameter {nameof(url)}. The query parameter {nameof(url)} must be a valid base64 encoded string"
            );
        }
    }

    private bool IsValidRedirectUri(string urlHost)
    {
        string validHost = _settings.HostName;
        int segments = _settings.HostName.Split('.').Length;

        List<string> goToList = Enumerable
            .Reverse(new List<string>(urlHost.Split('.')))
            .Take(segments)
            .Reverse()
            .ToList();
        string redirectHost = string.Join(".", goToList);

        return validHost.Equals(redirectHost, StringComparison.OrdinalIgnoreCase);
    }
}

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Serves the frontend's runtime configuration from settings, so that nothing writes it into wwwroot when the
/// container starts: the container may have neither a shell nor write access to its own files.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("designer/config")]
public class FrontendEnvironmentController : ControllerBase
{
    private readonly FrontendEnvironmentSettings _frontendEnvironmentSettings;
    private readonly StudioOidcLoginSettings _studioOidcLoginSettings;

    public FrontendEnvironmentController(
        FrontendEnvironmentSettings frontendEnvironmentSettings,
        StudioOidcLoginSettings studioOidcLoginSettings
    )
    {
        _frontendEnvironmentSettings = frontendEnvironmentSettings;
        _studioOidcLoginSettings = studioOidcLoginSettings;
    }

    [HttpGet("env.json")]
    [ProducesResponseType<FrontendEnvironmentResponse>(StatusCodes.Status200OK)]
    public ActionResult<FrontendEnvironmentResponse> GetEnvironment() =>
        new FrontendEnvironmentResponse(
            _frontendEnvironmentSettings.AiConnectionString,
            _frontendEnvironmentSettings.PostHogApiKey,
            _frontendEnvironmentSettings.PostHogApiHost,
            _studioOidcLoginSettings.AccountLinkUrl
        );
}

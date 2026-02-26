using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Hanldes application metadata
/// AllowAnonymous, because this is static known information and used from LocalTest
/// </summary>
[AllowAnonymous]
[ApiController]
public class ApplicationMetadataController : ControllerBase
{
    private readonly IAppMetadata _appMetadata;
    private readonly ILogger<ApplicationMetadataController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApplicationMetadataController"/> class
    /// <param name="appMetadata">The IAppMetadata service</param>
    /// <param name="logger">Logger for ApplicationMetadataController</param>
    /// </summary>
    public ApplicationMetadataController(IAppMetadata appMetadata, ILogger<ApplicationMetadataController> logger)
    {
        _appMetadata = appMetadata;
        _logger = logger;
    }

    /// <summary>
    /// Get the application metadata "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json"
    ///
    /// If org and app does not match, this returns a 409 Conflict response
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="checkOrgApp">Boolean get parameter to skip verification of correct org/app</param>
    /// <returns>Application metadata</returns>
    [ProducesResponseType(typeof(ApplicationMetadata), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(string), StatusCodes.Status409Conflict, "text/plain")]
    [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    [HttpGet("{org}/{app}/api/v1/applicationmetadata")]
    public async Task<ActionResult<ApplicationMetadata>> GetAction(
        string org,
        string app,
        [FromQuery] bool checkOrgApp = true
    )
    {
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();

        string wantedAppId = $"{org}/{app}";

        if (!checkOrgApp || application.Id.Equals(wantedAppId, StringComparison.Ordinal))
        {
            return Ok(application);
        }

        return Conflict($"This is {application.Id}, and not the app you are looking for: {wantedAppId}!");
    }

    /// <summary>
    /// Get the application XACML policy file
    ///
    /// If org and app does not match, this returns a 409 Conflict response
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <returns>XACML policy file</returns>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "text/xml")]
    [ProducesResponseType(typeof(string), StatusCodes.Status409Conflict, "text/plain")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpGet("{org}/{app}/api/v1/meta/authorizationpolicy")]
    public async Task<ActionResult<string>> GetPolicy(string org, string app)
    {
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        try
        {
            string policy = await _appMetadata.GetApplicationXACMLPolicy();
            string wantedAppId = $"{org}/{app}";

            if (application.Id.Equals(wantedAppId, StringComparison.Ordinal))
            {
                return Content(policy, "text/xml", System.Text.Encoding.UTF8);
            }

            return Conflict($"This is {application.Id}, and not the app you are looking for: {wantedAppId}!");
        }
        catch (FileNotFoundException)
        {
            return NotFound();
        }
    }

    /// <summary>
    /// Get the application BPMN process file
    ///
    /// If org and app does not match, this returns a 409 Conflict response
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <returns>BPMN process file</returns>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "text/xml")]
    [ProducesResponseType(typeof(string), StatusCodes.Status409Conflict, "text/plain")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [HttpGet("{org}/{app}/api/v1/meta/process")]
    public async Task<ActionResult<string>> GetProcess(string org, string app)
    {
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        string wantedAppId = $"{org}/{app}";
        try
        {
            if (application.Id.Equals(wantedAppId, StringComparison.Ordinal))
            {
                string process = await _appMetadata.GetApplicationBPMNProcess();
                return Content(process, "text/xml", System.Text.Encoding.UTF8);
            }

            return Conflict($"This is {application.Id}, and not the app you are looking for: {wantedAppId}!");
        }
        catch (ApplicationConfigException ex)
        {
            _logger.LogError(ex, "Failed to read process from file for appId: ${WantedApp}", wantedAppId);
            return NotFound();
        }
    }
}

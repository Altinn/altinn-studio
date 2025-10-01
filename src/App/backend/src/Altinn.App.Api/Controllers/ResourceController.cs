using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Controller to handle resources like css, images, javascript included in an app
/// </summary>
[ApiController]
public class ResourceController : ControllerBase
{
    private readonly IAppResources _appResourceService;

    /// <summary>
    /// Initializes a new instance of the <see cref="ResourceController"/> class
    /// </summary>
    /// <param name="appResourcesService">The execution service</param>
    public ResourceController(IAppResources appResourcesService)
    {
        _appResourceService = appResourcesService;
    }

    /// <summary>
    /// Get the json schema for the model
    /// </summary>
    /// <param name="id">Unique identifier of the model to fetch json schema for.</param>
    /// <returns>The model json schema.</returns>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "application/json")]
    [HttpGet]
    [Route("{org}/{app}/api/jsonschema/{id}")]
    public ActionResult GetModelJsonSchema([FromRoute] string id)
    {
        string schema = _appResourceService.GetModelJsonSchema(id);
        return Ok(schema);
    }

    /// <summary>
    /// Get the form layout
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <returns>A collection of FormLayout objects in JSON format.</returns>
    /// </summary>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "application/json")]
    [HttpGet]
    [Route("{org}/{app}/api/layouts")]
    public ActionResult GetLayouts(string org, string app)
    {
        string layouts = _appResourceService.GetLayouts();
        return Ok(layouts);
    }

    /// <summary>
    /// Get the form layout
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="id">The layoutset id</param>
    /// <returns>A collection of FormLayout objects in JSON format.</returns>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "application/json")]
    [HttpGet]
    [Route("{org}/{app}/api/layouts/{id}")]
    public ActionResult GetLayouts(string org, string app, string id)
    {
        string layouts = _appResourceService.GetLayoutsForSet(id);
        return Ok(layouts);
    }

    /// <summary>
    /// Get the layout settings.
    /// </summary>
    /// <param name="org">The application owner short name</param>
    /// <param name="app">The application name</param>
    /// <returns>The settings in the form of a string.</returns>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "application/json")]
    [HttpGet]
    [Route("{org}/{app}/api/layoutsettings")]
    public ActionResult GetLayoutSettings(string org, string app)
    {
        string? settings = _appResourceService.GetLayoutSettingsString();
        return Ok(settings);
    }

    /// <summary>
    /// Get the layout settings.
    /// </summary>
    /// <param name="org">The application owner short name</param>
    /// <param name="app">The application name</param>
    /// <param name="id">The layoutset id</param>
    /// <returns>The settings in the form of a string.</returns>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "application/json")]
    [HttpGet]
    [Route("{org}/{app}/api/layoutsettings/{id}")]
    public ActionResult GetLayoutSettings(string org, string app, string id)
    {
        string? settings = _appResourceService.GetLayoutSettingsStringForSet(id);
        return Ok(settings);
    }

    /// <summary>
    /// Get the layout-sets
    /// </summary>
    /// <param name="org">The application owner short name</param>
    /// <param name="app">The application name</param>
    /// <returns>The settings in the form of a string.</returns>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "application/json")]
    [HttpGet]
    [Route("{org}/{app}/api/layoutsets")]
    public ActionResult GetLayoutSets(string org, string app)
    {
        string settings = _appResourceService.GetLayoutSets();
        return Ok(settings);
    }

    /// <summary>
    /// Get the rule settings
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="id">The layoutset id</param>
    /// <returns>A collection of FormLayout objects in JSON format.</returns>
    /// </summary>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "text/javascript")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [HttpGet]
    [Route("{org}/{app}/api/rulehandler/{id}")]
    public ActionResult GetRulehandler(string org, string app, string id)
    {
        byte[] fileContent = _appResourceService.GetRuleHandlerForSet(id);
        if (fileContent != null)
        {
            return new FileContentResult(fileContent, "text/javascript");
        }

        return NoContent();
    }

    /// <summary>
    /// Get the ruleconfiguration.
    /// </summary>
    /// <param name="org">The application owner short name</param>
    /// <param name="app">The application name</param>
    /// <param name="id">The layoutset id</param>
    /// <returns>The settings in the form of a string.</returns>
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [HttpGet]
    [Route("{org}/{app}/api/ruleconfiguration/{id}")]
    public ActionResult GetRuleConfiguration(string org, string app, string id)
    {
        byte[] fileContent = _appResourceService.GetRuleConfigurationForSet(id);
        if (fileContent == null)
        {
            return NoContent();
        }

        return new FileContentResult(fileContent, MimeTypeMap.GetMimeType(".json").ToString());
    }

    /// <summary>
    /// Get the footer layout
    /// </summary>
    /// <param name="org">The application owner short name</param>
    /// <param name="app">The application name</param>
    /// <returns>The footer layout in the form of a string.</returns>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [HttpGet]
    [Route("{org}/{app}/api/v1/footer")]
    public async Task<ActionResult> GetFooterLayout(string org, string app)
    {
        string? layout = await _appResourceService.GetFooter();
        if (layout is null)
        {
            return NoContent();
        }

        return Ok(layout);
    }

    /// <summary>
    /// Get validation configuration file.
    /// </summary>
    /// <param name="org">The application owner short name</param>
    /// <param name="app">The application name</param>
    /// <param name="dataTypeId">Unique identifier of the model to fetch validations for.</param>
    /// <returns>The validation configuration file as json.</returns>
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "application/json")]
    [HttpGet]
    [Route("{org}/{app}/api/validationconfig/{dataTypeId}")]
    public ActionResult GetValidationConfiguration(string org, string app, string dataTypeId)
    {
        var validationConfiguration = _appResourceService.GetValidationConfiguration(dataTypeId);
        return Ok(validationConfiguration);
    }
}

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using IRepository = Altinn.Studio.Designer.Services.Interfaces.IRepository;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing actions that concerns app-development
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/app-development")]
    public class AppDevelopmentController : Controller
    {
        private readonly IAppDevelopmentService _appDevelopmentService;
        private readonly IRepository _repository;
        private readonly ISourceControl _sourceControl;
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly string _layoutSetNameRegEx = "[a-zA-Z0-9-]{3,28}";

        /// <summary>
        /// Initializes a new instance of the <see cref="AppDevelopmentController"/> class.
        /// </summary>
        /// <param name="appDevelopmentService">The app development service</param>
        /// <param name="repositoryService">The application repository service</param>
        /// <param name="sourceControl">The source control service.</param>
        /// <param name="altinnGitRepositoryFactory"></param>
        public AppDevelopmentController(IAppDevelopmentService appDevelopmentService, IRepository repositoryService, ISourceControl sourceControl, IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _appDevelopmentService = appDevelopmentService;
            _repository = repositoryService;
            _sourceControl = sourceControl;
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <summary>
        /// Default action for the designer.
        /// </summary>
        /// <returns>default view for the app builder.</returns>
        [Route("/editor/{org}/{app:regex(^[[a-z]]+[[a-zA-Z0-9-]]+[[a-zA-Z0-9]]$)}/{*AllValues}")]
        public IActionResult Index(string org, string app)
        {
            _sourceControl.VerifyCloneExists(org, app);
            return View();
        }

        /// <summary>
        /// Get all form layouts
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of the layoutset to get layouts for</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("form-layouts")]
        public async Task<ActionResult<Dictionary<string, JsonNode>>> GetFormLayouts(string org, string app, [FromQuery] string layoutSetName)
        {
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) || Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                Dictionary<string, JsonNode> formLayouts = await _appDevelopmentService.GetFormLayouts(org, app, developer, layoutSetName);
                return Ok(formLayouts);
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
            catch (BadHttpRequestException exception)
            {
                return BadRequest(exception.Message);
            }
        }

        /// <summary>
        /// Save form layout as JSON
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of layoutSet the specific layout belongs to</param>
        /// <param name="layoutName">The name of the form layout to be saved.</param>
        /// /// <param name="formLayout">The content to be saved to the layout</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [UseSystemTextJson]
        [Route("form-layout/{layoutName}")]
        public async Task<ActionResult> SaveFormLayout(string org, string app, [FromQuery] string layoutSetName, [FromRoute] string layoutName, [FromBody] JsonNode formLayout)
        {
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) || Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                await _appDevelopmentService.SaveFormLayout(org, app, developer, layoutSetName, layoutName, formLayout);
                return Ok("Layout successfully saved.");
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Delete a form layout
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">The name of the layoutset the specific layout belongs to</param>
        /// <param name="layoutName">The form layout to be deleted</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpDelete]
        [Route("form-layout/{layoutName}")]
        public ActionResult DeleteFormLayout(string org, string app, [FromQuery] string layoutSetName, [FromRoute] string layoutName)
        {
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) || Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                _appDevelopmentService.DeleteFormLayout(org, app, developer, layoutSetName, layoutName);
                return Ok("Layout successfully deleted.");
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Update a form layout name
        /// </summary>
        /// <param name="newName">The new name of the form layout.</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of the layoutset the specific layout belongs to</param>
        /// <param name="layoutName">The current name of the form layout</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [Route("form-layout-name/{layoutName}")]
        public ActionResult UpdateFormLayoutName(string org, string app, [FromQuery] string layoutSetName, [FromRoute] string layoutName, [FromBody] string newName)
        {
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) || Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                _appDevelopmentService.UpdateFormLayoutName(org, app, developer, layoutSetName, layoutName, newName);
                return Ok("Layout name successfully changed.");
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Saves the layout settings for an app without layoutsets
        /// </summary>
        /// <param name="layoutSetName">Name of the layoutset the layoutsettings belong to</param>
        /// <param name="layoutSettings">The data to be saved</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [UseSystemTextJson]
        [Route("layout-settings")]
        public async Task<ActionResult> SaveLayoutSettings(string org, string app, [FromQuery] string layoutSetName, [FromBody] JsonNode layoutSettings)
        {
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) || Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                await _appDevelopmentService.SaveLayoutSettings(org, app, developer, layoutSettings, layoutSetName);
                return Ok("Layout settings successfully saved.");
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Gets the layout settings for an app without layoutSets
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of the layoutset the specific layoutsettings belong to</param>
        /// <returns>The content of the settings file</returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("layout-settings")]
        public async Task<ActionResult<JsonNode>> GetLayoutSettings(string org, string app, [FromQuery] string layoutSetName)
        {
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) || Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                var layoutSettings = await _appDevelopmentService.GetLayoutSettings(org, app, developer, layoutSetName);
                return Ok(layoutSettings);
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
            catch (BadHttpRequestException exception)
            {
                return BadRequest(exception);
            }
        }

        /// <summary>
        /// Get all layoutsets in the layout-set.json file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The layout-sets.json</returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("layout-sets")]
        public async Task<ActionResult<JsonNode>> GetLayoutSets(string org, string app)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                LayoutSets layoutSets = await _appDevelopmentService.GetLayoutSets(org, app, developer);
                if (layoutSets is null)
                {
                    return Ok("App is not configured to use layout sets");
                }
                return Ok(layoutSets);
            }
            catch (FileNotFoundException)
            {
                return NotFound("Layout-sets.json not found");
            }
        }

        /// <summary>
        /// Create a layout-set.json file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of initial layout set</param>
        /// <returns>The layout-sets.json</returns>
        [HttpPost]
        [UseSystemTextJson]
        [Route("layout-sets")]
        public async Task<ActionResult<LayoutSets>> ConfigureLayoutSet(string org, string app, [FromQuery] string layoutSetName)
        {
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) ||
                                            Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }

                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                LayoutSets layoutSets = await _appDevelopmentService.ConfigureLayoutSet(org, app, developer, layoutSetName);
                return Ok(layoutSets);
            }
            catch (BadHttpRequestException exception)
            {
                return BadRequest(exception.Message);
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Add a layoutset to the layout-sets.json file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSet">The config needed for the layout set to be added to layout-sets.json</param>
        [HttpPut]
        [Route("layout-sets")]
        public async Task<ActionResult> AddLayoutSet(string org, string app, [FromQuery] LayoutSetConfig layoutSet)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                await _appDevelopmentService.AddLayoutSet(org, app, developer, layoutSet);
                return Ok("Layout set added");
            }
            catch (FileNotFoundException exception)
            {
                return NotFound($"Layout-sets.json not found: {exception}");
            }
        }

        /// <summary>
        /// Get rule handler in JSON structure
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of the layout set the specific rule handler belong to</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [Route("rule-handler")]
        public async Task<IActionResult> GetRuleHandler(string org, string app, [FromQuery] string layoutSetName)
        {
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) || Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                string ruleHandler = await _appDevelopmentService.GetRuleHandler(org, app, developer, layoutSetName);
                return Content(ruleHandler);
            }
            catch (FileNotFoundException)
            {
                return NotFound("Could not find rule handler in app.");
            }
            catch (BadHttpRequestException exception)
            {
                return BadRequest($"Could not get rule handler: {exception}");
            }
        }

        /// <summary>
        /// Save rule handler in JSON structure
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of the layout set the specific rule handler belong to</param>
        /// <returns>The model representation as JSON</returns>
        [HttpPost]
        [Route("rule-handler")]
        public async Task<IActionResult> SaveRuleHandler(string org, string app, [FromQuery] string layoutSetName)
        {
            string content = string.Empty;
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) || Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                using (StreamReader reader = new(Request.Body))
                {
                    content = await reader.ReadToEndAsync();
                    await _appDevelopmentService.SaveRuleHandler(org, app, developer, content, layoutSetName);
                }

                return NoContent();
            }
            catch (IOException)
            {
                return BadRequest("Could not save rule handler");
            }
        }

        /// <summary>
        /// Save rule configuration
        /// </summary>
        /// <param name="ruleConfig">The code list data to save</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of layout set</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [UseSystemTextJson]
        [Route("rule-config")]
        public async Task<IActionResult> SaveRuleConfig(string org, string app, [FromBody] JsonNode ruleConfig, [FromQuery] string layoutSetName)
        {
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) || Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                await _appDevelopmentService.SaveRuleConfig(org, app, developer, ruleConfig, layoutSetName);
                return Ok("Rule configuration successfully saved.");
            }
            catch (Exception exception)
            {
                return BadRequest($"Rule configuration could not be saved: {exception}");
            }
        }

        /// <summary>
        /// Get rule configuration
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of layout set</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [Route("rule-config")]
        public async Task<IActionResult> GetRuleConfig(string org, string app, [FromQuery] string layoutSetName)
        {
            try
            {
                bool isValidLayoutSetName = string.IsNullOrEmpty(layoutSetName) || Regex.IsMatch(layoutSetName, _layoutSetNameRegEx);
                if (!isValidLayoutSetName)
                {
                    return BadRequest("LayoutSetName is not valid");
                }
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                string ruleConfig = await _appDevelopmentService.GetRuleConfig(org, app, developer, layoutSetName);
                return Content(ruleConfig);
            }
            catch (FileNotFoundException)
            {
                // Return 204 because the file is not required to exist
                return NoContent();
            }
            catch (BadHttpRequestException exception)
            {
                return BadRequest($"Could not get rule configuration: {exception}");
            }
        }

        /// <summary>
        /// Gets widget settings for app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The widget settings for the app.</returns>
        [HttpGet]
        [Route("widget-settings")]
        public ActionResult GetWidgetSettings(string org, string app)
        {
            string widgetSettings = _repository.GetWidgetSettings(org, app);
            return Ok(widgetSettings);
        }

        [HttpGet]
        [Route("option-list-ids")]
        public ActionResult GetOptionListIds(string org, string app)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                string[] optionListIds = altinnAppGitRepository.GetOptionListIds();
                return Ok(optionListIds);
            }
            catch (LibGit2Sharp.NotFoundException)
            {
                return NoContent();
            }
        }
    }
}

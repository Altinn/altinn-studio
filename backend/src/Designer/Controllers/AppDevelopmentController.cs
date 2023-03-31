using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Mime;
using System.Text;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

        /// <summary>
        /// Initializes a new instance of the <see cref="AppDevelopmentController"/> class.
        /// </summary>
        /// <param name="appDevelopmentService">The app development service</param>
        /// <param name="repositoryService">The application repository service</param>
        /// <param name="sourceControl">The source control service.</param>
        public AppDevelopmentController(IAppDevelopmentService appDevelopmentService, IRepository repositoryService, ISourceControl sourceControl)
        {
            _appDevelopmentService = appDevelopmentService;
            _repository = repositoryService;
            _sourceControl = sourceControl;
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
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("form-layouts")]
        public async Task<ActionResult<Dictionary<string, JsonNode>>> GetFormLayouts(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                Dictionary<string, JsonNode> formLayouts = await _appDevelopmentService.GetFormLayouts(org, app, developer, null);
                return Ok(formLayouts);
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Save form layout as JSON
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutName">The name of the form layout to be saved.</param>
        /// /// <param name="formLayout">The content to be saved to the layout</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [UseSystemTextJson]
        [Route("form-layout/{layoutName}")]
        public async Task<ActionResult> SaveFormLayout(string org, string app, [FromRoute] string layoutName, [FromBody] JsonNode formLayout)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                await _appDevelopmentService.SaveFormLayout(org, app, developer, null, layoutName, formLayout);
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
        /// <param name="layoutName">The form layout to be deleted</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpDelete]
        [Route("form-layout/{layoutName}")]
        public ActionResult DeleteFormLayout(string org, string app, string layoutName)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                _appDevelopmentService.DeleteFormLayout(org, app, developer, null, layoutName);
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
        /// <param name="layoutName">The current name of the form layout</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [Route("form-layout-name/{layoutName}")]
        public ActionResult UpdateFormLayoutName(string org, string app, string layoutName, [FromBody] string newName)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                _appDevelopmentService.UpdateFormLayoutName(org, app, developer, null, layoutName, newName);
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
        /// <param name="layoutSettings">The data to be saved</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [UseSystemTextJson]
        [Route("layout-settings")]
        public async Task<ActionResult> SaveLayoutSettings(string org, string app, [FromBody] LayoutSettings layoutSettings)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                await _appDevelopmentService.SaveLayoutSettings(org, app, developer, layoutSettings, null);
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
        /// <returns>The content of the settings file</returns>
        [HttpGet]
        [UseSystemTextJson]
        [Route("layout-settings")]
        public async Task<ActionResult<LayoutSettings>> GetLayoutSettings(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                LayoutSettings layoutSettings = await _appDevelopmentService.GetLayoutSettings(org, app, developer, null);
                return Ok(layoutSettings);
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
        }

        /// <summary>
        /// Get rule handler in JSON structure
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [Route("rule-handler")]
        public IActionResult GetRuleHandler(string org, string app)
        {
            return Content(_repository.GetRuleHandler(org, app), "application/javascript", Encoding.UTF8);
        }

        /// <summary>
        /// Save rule handler in JSON structure
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="stageFile"></param>
        /// <returns>The model representation as JSON</returns>
        [HttpPost]
        [Route("rule-handler")]
        public async Task<IActionResult> SaveRuleHandler(string org, string app, bool stageFile)
        {
            string content = string.Empty;
            try
            {
                using (StreamReader reader = new(Request.Body))
                {
                    content = await reader.ReadToEndAsync();
                    _repository.SaveRuleHandler(org, app, content);
                }

                if (stageFile)
                {
                    _sourceControl.StageChange(org, app, "RuleHandler.js");
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
        /// <param name="jsonData">The code list data to save</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [Route("rule-config")]
        public IActionResult SaveRuleConfig([FromBody] dynamic jsonData, string org, string app)
        {
            _repository.SaveRuleConfig(org, app, jsonData.ToString());
            return Ok("Rule configuration saved");
        }

        /// <summary>
        /// Get rule configuration
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [Route("rule-config")]
        public IActionResult GetRuleConfig(string org, string app)
        {
            return Content(_repository.GetRuleConfig(org, app), MediaTypeNames.Application.Json, Encoding.UTF8);
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
    }
}

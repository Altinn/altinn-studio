using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.KeyVault.Models;

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
        /// Get form layout as JSON
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [Route("form-layouts")]
        public IActionResult GetFormLayout(string org, string app)
        {
            return Content(_repository.GetJsonFormLayouts(org, app), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Save form layout as JSON
        /// </summary>
        /// <param name="jsonData">The code list data to save</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutName">The name of the form layout to be saved.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [Route("form-layout/{layoutName}")]
        public IActionResult SaveFormLayout([FromBody] dynamic jsonData, string org, string app, string layoutName)
        {
            _repository.SaveFormLayout(org, app, layoutName, jsonData.ToString());

            return Ok("From layout successfully saved.");
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
        public IActionResult DeleteFormLayout(string org, string app, string layoutName)
        {
            if (_repository.DeleteFormLayout(org, app, layoutName))
            {
                return Ok("From layout successfully deleted.");
            }

            return BadRequest("Form layout could not be deleted.");
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
        /// <returns>The model representation as JSON</returns>
        [HttpPost]
        [Route("rule-handler")]
        public IActionResult SaveRuleHandler(string org, string app, bool stageFile)
        {
            string content = string.Empty;
            try
            {
                using (var reader = new StreamReader(Request.Body))
                {
                    content = reader.ReadToEnd();
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
        /// Update a form layout name
        /// </summary>
        /// <param name="newName">The new name of the form layout.</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutName">The current name of the form layuout</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [Route("form-layout-name/{layoutName}")]
        public IActionResult UpdateFormLayoutName([FromBody] string newName, string org, string app, string layoutName)
        {
            if (_repository.UpdateFormLayoutName(org, app, layoutName, newName))
            {
                return Ok("From layout name successfully updated.");
            }

            return BadRequest("Form layout name could not be updated.");
        }

        /// <summary>
        /// Saves the layout settings
        /// </summary>
        /// <param name="layoutSettings">The data to be saved</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [Route("layout-settings")]
        public async Task<IActionResult> SaveLayoutSettings([FromBody] LayoutSettings layoutSettings, string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                await _appDevelopmentService.SaveLayoutSettings(org, app, developer, layoutSettings);
                return Ok("Layout settings successfully saved.");
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
            }
        }

        /// <summary>
        /// Gets the layout settings
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The content of the settings file</returns>
        [HttpGet]
        [Route("layout-settings")]
        public async Task<ActionResult<LayoutSettings>> GetLayoutSettings(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);

            try
            {
                LayoutSettings layoutSettings = await _appDevelopmentService.GetLayoutSettings(org, app, developer);
                return Ok(layoutSettings);
            }
            catch (FileNotFoundException exception)
            {
                return NotFound(exception.Message);
            }
            catch (Exception exception)
            {
                return BadRequest(exception.Message);
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
            return Content(_repository.GetRuleConfig(org, app), "application/javascript", Encoding.UTF8);
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
            var widgetSettings = _repository.GetWidgetSettings(org, app);
            return Ok(widgetSettings);
        }

        /// <summary>
        /// Get text resource as JSON for specified language
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="languageCode">The language id for the text resource file</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [Route("text/{languageCode}")]
        [Obsolete("UiEditorController.GetTextResources is deprecated, please use TextController.GetResource")]
        public IActionResult GetTextResources(string org, string app, string languageCode)
        {
            try
            {
                var result = _repository.GetLanguageResource(org, app, languageCode);
                return Ok(result);
            }
            catch
            {
                return NotFound($"The text resource, resource.{languageCode}.json, was not found.");
            }
        }

        /// <summary>
        /// Add text resources to existing resource documents
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="textResources">The collection of text resources to be added</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        [Route("text/{languageCode}")]
        [Obsolete("FormEditorController.AddTextResources is deprecated, please use TextController.UpdateTextsForKeys")]
        public IActionResult AddTextResources(string org, string app, [FromBody] List<TextResource> textResources)
        {
            if (_repository.AddTextResources(org, app, textResources))
            {
                return Ok();
            }

            return BadRequest("Text resource could not be added.");
        }
    }
}

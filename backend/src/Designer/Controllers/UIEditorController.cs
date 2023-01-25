using System;
using System.Collections.Generic;
using System.Text;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing all react-ions
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/{org}/{app:regex(^[[a-z]]+[[a-zA-Z0-9-]]+[[a-zA-Z0-9]]$)}/[controller]/[action]")]
    public class UIEditorController : Controller
    {
        private readonly IRepository _repository;
        private readonly ServiceRepositorySettings _repoSettings;

        /// <summary>
        /// Initializes a new instance of the <see cref="UIEditorController"/> class.
        /// </summary>
        /// <param name="repositoryService">The application repository service</param>
        /// <param name="settings">The application repository settings.</param>
        public UIEditorController(
            IRepository repositoryService,
            IOptions<ServiceRepositorySettings> settings)
        {
            _repository = repositoryService;
            _repoSettings = settings.Value;
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <returns>A view with the React form builder</returns>
        [Route("")]
        public IActionResult Index()
        {
            return RedirectToAction("Index", "ServiceDevelopment");
        }

        /// <summary>
        /// Get form layout as JSON
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public IActionResult GetFormLayout(string org, string app)
        {
            return Content(_repository.GetJsonFormLayouts(org, app), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get rule handler in JSON structure
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public IActionResult GetRuleHandler(string org, string app)
        {
            return Content(_repository.GetRuleHandler(org, app), "application/javascript", Encoding.UTF8);
        }

        /// <summary>
        /// Get text resource as JSON for specified language
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="languageCode">The language id for the text resource file</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        [Route("{languageCode}")]
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
        public IActionResult AddTextResources(string org, string app, [FromBody] List<TextResource> textResources)
        {
            if (_repository.AddTextResources(org, app, textResources))
            {
                return Ok();
            }

            return BadRequest("Text resource could not be added.");
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
        [Route("{layoutName}")]
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
        [Route("{layoutName}")]
        public IActionResult DeleteFormLayout(string org, string app, string layoutName)
        {
            if (_repository.DeleteFormLayout(org, app, layoutName))
            {
                return Ok("From layout successfully deleted.");
            }

            return BadRequest("Form layout could not be deleted.");
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
        [Route("{layoutName}")]
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
        /// <param name="jsonData">The data to be saved</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A success message if the save was successful</returns>
        public IActionResult SaveLayoutSettings([FromBody] dynamic jsonData, string org, string app)
        {
            if (_repository.SaveLayoutSettings(org, app, jsonData.ToString()))
            {
                return Ok("Layout settings successfully saved.");
            }

            return BadRequest("Layout settings could not be saved.");
        }

        /// <summary>
        /// Gets the layout settings
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The content of the settings file</returns>
        public IActionResult GetLayoutSettings(string org, string app)
        {
            return Content(_repository.GetLayoutSettings(org, app), "application/json", Encoding.UTF8);
        }

        /// <summary>
        /// Save JSON data as file
        /// </summary>
        /// <param name="jsonData">The code list data to save</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The filename to be saved as</param>
        /// <returns>A success message if the save was successful</returns>
        [HttpPost]
        public IActionResult SaveJsonFile([FromBody] dynamic jsonData, string org, string app, [FromQuery] string fileName)
        {
            if (!ApplicationHelper.IsValidFilename(fileName))
            {
                return BadRequest();
            }

            if (fileName.Equals(_repoSettings.GetRuleConfigFileName()))
            {
                _repository.SaveRuleConfigJson(org, app, jsonData.ToString());
            }
            else
            {
                _repository.SaveJsonFile(org, app, jsonData.ToString(), fileName);
            }

            return Ok($"{fileName} saved");
        }

        /// <summary>
        /// Get JSON file in JSON structure
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The filename to read from</param>
        /// <returns>The model representation as JSON</returns>
        [HttpGet]
        public IActionResult GetJsonFile(string org, string app, [FromQuery] string fileName)
        {
            if (!ApplicationHelper.IsValidFilename(fileName))
            {
                return BadRequest();
            }

            return Content(_repository.GetJsonFile(org, app, fileName), "application/javascript", Encoding.UTF8);
        }

        /// <summary>
        /// Adds the metadata for attachment
        /// </summary>
        /// <param name="applicationMetadata">the application meta data to be updated</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult AddMetadataForAttachment([FromBody] dynamic applicationMetadata, string org, string app)
        {
            try
            {
                _repository.AddMetadataForAttachment(org, app, applicationMetadata.ToString());
                return Ok("Metadata saved");
            }
            catch
            {
                return BadRequest("Could not save metadata");
            }
        }

        /// <summary>
        /// Updates the metadata for attachment
        /// </summary>
        /// <param name="applicationMetadata">the application meta data to be updated</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult UpdateMetadataForAttachment([FromBody] dynamic applicationMetadata, string org, string app)
        {
            try
            {
                _repository.UpdateMetadataForAttachment(org, app, applicationMetadata.ToString());
                return Ok("Metadata updated");
            }
            catch
            {
                return BadRequest("Could not update metadata");
            }
        }

        /// <summary>
        /// Deletes the metadata for attachment
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">the id of the component</param>
        /// <returns></returns>
        [HttpPost]
        public IActionResult DeleteMetadataForAttachment(string org, string app, string id)
        {
            try
            {
                _repository.DeleteMetadataForAttachment(org, app, id);
                return Ok("Metadata deleted");
            }
            catch
            {
                return BadRequest("Could not delete metdata");
            }
        }

        /// <summary>
        /// Gets widget settings for app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The widget settings for the app.</returns>
        [HttpGet]
        public ActionResult GetWidgetSettings(string org, string app)
        {
            var widgetSettings = _repository.GetWidgetSettings(org, app);
            return Ok(widgetSettings);
        }
    }
}

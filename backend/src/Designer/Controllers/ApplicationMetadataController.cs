using System.IO;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Services.Interfaces;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller for serving/editing the application metadata json file
    /// </summary>
    [ApiController]
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("/designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/metadata")]
    public class ApplicationMetadataController : ControllerBase
    {
        private readonly IRepository _repository;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationMetadataController"/> class.
        /// </summary>
        /// <param name="repository">The repository implementation</param>
        public ApplicationMetadataController(IRepository repository)
        {
            _repository = repository;
        }

        /// <summary>
        /// Gets the application metadata, url GET "/designer/api/org/app/metadata"
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The application metadata</returns>
        [HttpGet]
        public ActionResult GetApplicationMetadata(string org, string app)
        {
            Application application = _repository.GetApplication(org, app);
            if (application == null)
            {
                return NotFound();
            }

            return Ok(application);
        }

        /// <summary>
        /// Puts the application metadata, url PUT "/designer/api/org/app/metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationMetadata">The application metadata</param>
        /// <returns>The updated application metadata</returns>
        [HttpPut]
        public ActionResult UpdateApplicationMetadata(string org, string app, [FromBody] Application applicationMetadata)
        {
            _repository.UpdateApplication(org, app, applicationMetadata);
            Application updatedApplicationMetadata = _repository.GetApplication(org, app);
            return Ok(updatedApplicationMetadata);
        }

        /// <summary>
        /// Create an application metadata, url POST "/designer/api/org/app/metadata"
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The created application metadata</returns>
        [HttpPost]
        public ActionResult CreateApplicationMetadata(string org, string app)
        {
            if (_repository.GetApplication(org, app) != null)
            {
                return Conflict("ApplicationMetadata already exists.");
            }

            // TODO: Application title handling (issue #2053/#1725)
            _repository.CreateApplicationMetadata(org, app, app);
            Application createdApplication = _repository.GetApplication(org, app);
            if (createdApplication == null)
            {
                return StatusCode(500);
            }

            return Created($"/designer/api/{org}/{app}", createdApplication);
        }

        /// <summary>
        /// Adds the metadata for attachment
        /// </summary>
        /// <param name="applicationMetadata">the application meta data to be updated</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns></returns>
        [HttpPost]
        [Route("attachment-component")]
        public IActionResult AddMetadataForAttachment([FromBody] dynamic applicationMetadata, string org, string app)
        {
            try
            {
                _repository.AddMetadataForAttachment(org, app, applicationMetadata.ToString());
                return Ok("Metadata saved");
            }
            catch (IOException)
            {
                return BadRequest("Could not save metadata");
            }
        }

        /// <summary>
        /// Updates the metadata when changing the properties for attachment component
        /// </summary>
        /// <param name="applicationMetadata">the application meta data to be updated</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns></returns>
        [HttpPut]
        [Route("attachment-component")]
        public IActionResult UpdateMetadataForAttachment([FromBody] dynamic applicationMetadata, string org, string app)
        {
            try
            {
                _repository.UpdateMetadataForAttachment(org, app, applicationMetadata.ToString());
                return Ok("Metadata updated");
            }
            catch (IOException)
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
        [HttpDelete]
        [Route("attachment-component")]
        public IActionResult DeleteMetadataForAttachment(string org, string app, string id)
        {
            try
            {
                _repository.DeleteMetadataForAttachment(org, app, id);
                return Ok("Metadata deleted");
            }
            catch (IOException)
            {
                return BadRequest("Could not delete metadata");
            }
        }
    }
}

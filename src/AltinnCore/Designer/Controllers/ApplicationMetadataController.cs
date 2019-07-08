using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Designer.Controllers
{
    /// <summary>
    /// Controller for serving/editing the application metadata json file
    /// </summary>
    [Route("/designer/api/v1/{org}/{app}")]
    public class ApplicationMetadataController : ControllerBase
    {
        private readonly IRepository _repository;
        private readonly ILogger _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationMetadataController"/> class.
        /// </summary>
        /// <param name="logger">The logger implementation</param>
        /// <param name="repository">The repository implementation</param>
        public ApplicationMetadataController(ILogger<ApplicationMetadataController> logger, IRepository repository)
        {
            _logger = logger;
            _repository = repository;
        }

        /// <summary>
        /// Gets the application metadata, url GET "/designer/api/v1/org/app/"
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="app">The the application</param>
        /// <returns>The application metadata</returns>
        [HttpGet]
        public ActionResult ApplicationMetadata(string org, string app)
        {
            Application application = _repository.GetApplication(org, app);
            if (application == null)
            {
                _repository.CreateApplication(org, app);
                application = _repository.GetApplication(org, app);
            }

            return Ok(application);
        }

        /// <summary>
        /// Puts the application metadata, url PUT "/designer/api/v1/org/app/
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="app">The application</param>
        /// <param name="applicationMetadata">The application metadata</param>
        /// <returns>The updated application metadata</returns>
        [HttpPut]
        public ActionResult ApplicationMetadata(string org, string app, [FromBody] dynamic applicationMetadata)
        {
            if (_repository.AddMetadataForAttachment(org, app, applicationMetadata.ToString()))
            {
                return Ok(applicationMetadata);
            }
            else
            {
                return StatusCode(500);
            }
        }
    }
}

using System.Collections.Generic;
using System.Text;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// This is the controller responsible for handling model functionality in AltinnCore
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("designer/api/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/model")]
    public class ModelController : Controller
    {
        private readonly IRepository _repository;
        private readonly ILoggerFactory _loggerFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="ModelController"/> class
        /// </summary>
        /// <param name="repositoryService">The service Repository Service</param>
        /// <param name="loggerFactory"> the logger factory</param>
        public ModelController(IRepository repositoryService, ILoggerFactory loggerFactory)
        {
            _repository = repositoryService;
            _loggerFactory = loggerFactory;
        }

        /// <summary>
        /// The default action presenting the application model.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model main page</returns>
        [HttpGet]
        [Route("Index")]
        public ActionResult Index(string org, string app)
        {
            ModelMetadata metadata = _repository.GetModelMetadata(org, app);
            return View(metadata);
        }

        /// <summary>
        /// Return JSON presentation of the model
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model as JSON</returns>
        [HttpGet]
        [Route("metadata")]
        public IActionResult GetJson(string org, string app)
        {
            try
            {
                ModelMetadata metadata = _repository.GetModelMetadata(org, app);
                return Json(metadata, new JsonSerializerSettings() { Formatting = Formatting.Indented });
            }
            catch
            {
                return NotFound();
            }
        }

        /// <summary>
        /// Returns the model as C# code
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model as C#</returns>
        [HttpGet]
        [Route("csharp")]
        public ActionResult GetModel(string org, string app)
        {
            return Content(_repository.GetAppModel(org, app), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get the model as XSD
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model representation as XSD</returns>
        [HttpGet]
        [Route("xsd")]
        public ActionResult GetXsd(string org, string app)
        {
            return Content(_repository.GetXsdModel(org, app), "text/plain", Encoding.UTF8);
        }

        /// <summary>
        /// Get the model as Json Schema
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The model representation as Json Schema</returns>
        [HttpGet]
        [Route("json-schema")]
        public ActionResult GetJsonSchema(string org, string app)
        {
            return Content(_repository.GetJsonSchemaModel(org, app), "text/plain", Encoding.UTF8);
        }
    }
}

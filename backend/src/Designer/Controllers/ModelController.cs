using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// This is the controller responsible for handling model functionality in AltinnCore
    /// </summary>
    [Obsolete("ModelController is deprecated. Please use DatamodelsController instead.")]
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
        /// Return JSON presentation of the model
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of current layoutSet in ux-editor that edited layout belongs to</param>
        /// <param name="cancellationToken">An <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The model as JSON</returns>
        [Obsolete("GetJson is deprecated. Please create new method in SchemaModelService (or AppDevelopmentService?) to serve Studio frontend with the datamodel fields for the specified datamodel.")]
        [HttpGet]
        [Route("metadata")]
        public async Task<ActionResult> GetJson(string org, string app, [FromQuery] string layoutSetName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                ModelMetadata metadata = await _repository.GetModelMetadata(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer), layoutSetName, cancellationToken);
                return Json(metadata, new JsonSerializerSettings { Formatting = Formatting.Indented });
            }
            catch
            {
                return NotFound();
            }
        }
    }
}

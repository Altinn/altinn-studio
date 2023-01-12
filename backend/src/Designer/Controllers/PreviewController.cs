using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to data modelling
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("preview/{org}/{app}")]
    public class PreviewController : Controller
    {
        private readonly IRepository _repository;
        private readonly ISchemaModelService _schemaModelService;
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="PreviewController"/> class.
        /// </summary>
        /// <param name="repositoryService">The service repository service.</param>
        /// <param name="sourceControl">The source control service.</param>
        /// <param name="altinnGitRepositoryFactory">
        /// Factory class that knows how to create types of <see cref="AltinnGitRepository"/>
        /// </param>
        public PreviewController(
            IRepository repositoryService, ISourceControl sourceControl, IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _repository = repositoryService;
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/v1/applicationmetadata")]
        [HttpGet]
        public IActionResult ApplicationMetadata(string org, string app)
        {
            // var developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            // var altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);

            var applicationMetadata = _repository.GetApplication(org, app);
            return Ok(applicationMetadata);
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/v1/applicationsettings")]
        [HttpGet]
        public IActionResult ApplicationSettings(string org, string app)
        {
            return Ok();
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/layoutsets")]
        [HttpGet]
        public IActionResult LayoutSets(string org, string app)
        {
            var layoutsets = _repository.GetFileByRelativePath(org, app, "/App/ui/layout-sets.json");
            return Content(layoutsets);
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/jsonschema/bestilling")]
        [HttpGet]
        public IActionResult JsonSchema(string org, string app)
        {
            var layoutsets = _repository.GetFileByRelativePath(org, app, "/App/models/bestilling.schema.json");
            return Content(layoutsets);
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("v1/data/anonymous")]
        [HttpGet]
        public IActionResult DataModel(string org, string app)
        {
            string user = @"{}";
            return Content(user);
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/authentication/keepAlive")]
        [HttpGet]
        public IActionResult KeepAlive(string org, string app)
        {
            return Ok();
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/v1/profile/user")]
        [HttpGet]
        public IActionResult CurrentUser(string org, string app)
        {
            string user = @"{
                ""userId"": 1001,
                ""userName"": ""PengelensPartner"",
                ""phoneNumber"": ""12345678"",
                ""email"": ""test@test.com"",
                ""partyId"": 500000,
                ""party"": {

                },
                ""userType"": 0,
                ""profileSettingPreference"": {
                    ""language"": ""nb""
                }
            }";

            return Ok(user);
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/authorization/parties/current")]
        [HttpGet]
        public IActionResult CurrentParty(string org, string app)
        {
            string party = @"{
            ""partyId"": ""500000"",
            ""partyTypeName"": 2,
            ""orgNumber"": ""897069650"",
            ""ssn"": null,
            ""unitType"": ""AS"",
            ""name"": ""DDG Fitness"",
            ""isDeleted"": false,
            ""onlyHierarchyElementWithNoAccess"": false,
            ""person"": null,
            ""organisation"": null,
            ""childParties"": null
        }";
            return Ok(party);
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/v1/parties/validateInstantiation")]
        [HttpPost]
        public IActionResult ValidateInstantiation(string org, string app)
        {
            return Content(@"{""valid"": true}");
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/v1/texts/nb")]
        [HttpGet]
        public IActionResult Language(string org, string app)
        {
            var resources = _repository.GetFileByRelativePath(org, app, "/App/config/texts/resource.nb.json");
            return Content(resources);
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/textresources")]
        [HttpGet]
        public IActionResult TextResources(string org, string app)
        {
            var resources = _repository.GetFileByRelativePath(org, app, "App/config/texts/resource.nb.json");
            return Content(resources);
        }

        /// <summary>
        /// The index action which will show the React form builder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        // <param name="modelname">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [Route("api/jsonschema/{modelname}")]
        public IActionResult Datamodel(string org, string app, string modelname)
        {
            var resources = _repository.GetFileByRelativePath(org, app, $"/App/models/{modelname}.schema.json");
            return Content(resources);
        }
    }
}

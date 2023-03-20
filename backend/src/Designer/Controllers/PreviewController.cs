using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to preview - still under development
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    [Route("preview/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}")]
    public class PreviewController : Controller
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;

        /// <summary>
        /// Initializes a new instance of the <see cref="PreviewController"/> class.
        /// </summary>
        /// <param name="httpContextAccessor"></param>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepositoryFactory</param>
        /// Factory class that knows how to create types of <see cref="AltinnGitRepository"/>
        public PreviewController(IHttpContextAccessor httpContextAccessor, IAltinnGitRepositoryFactory altinnGitRepositoryFactory)
        {
            _httpContextAccessor = httpContextAccessor;
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
        }

        /// <summary>
        /// Default action for the preview.
        /// </summary>
        /// <returns>default view for the app preview.</returns>
        [HttpGet]
        [Route("gui/{*AllValues}")]
        public IActionResult Index(string org, string app)
        {
            return View();
        }


        /// <summary>
        /// Action for getting the application metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A view with the React form builder</returns>
        [HttpGet]
        [Route("api/applicationmetadata")]
        public async Task<ActionResult<Application>> ApplicationMetadata(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            Application applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata();
            return Ok(applicationMetadata);
        }

        /// <summary>
        /// Action for mocking a response containing the application settings
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>200 Ok</returns>
        [HttpGet]
        [Route("api/applicationsettings")]
        public IActionResult ApplicationSettings(string org, string app)
        {
            return Ok();
        }

        /// <summary>
        /// Action for getting the layout sets
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>layoutsets example file</returns>
        [HttpGet]
        [Route("api/layoutsets")]
        public async Task<ActionResult<LayoutSets>> LayoutSets(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile();
            return Ok(layoutSets);
        }

        /// <summary>
        /// Action for getting a response from v1/data/anonymous
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Empty object</returns>
        [HttpGet]
        [Route("api/data/anonymous")]
        public IActionResult DataModel(string org, string app)
        {
            string user = @"{}";
            return Content(user);
        }

        /// <summary>
        /// Action for responding to keepAlive
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>200 Ok</returns>
        [HttpGet]
        [Route("api/authentication/keepAlive")]
        public IActionResult KeepAlive(string org, string app)
        {
            return Ok();
        }

        /// <summary>
        /// Action for mocking a response to the profile user
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>An example user</returns>
        [HttpGet]
        [Route("api/profile/user")]
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
        /// Action for mocking a response to the current party
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>An example party</returns>
        [HttpGet]
        [Route("api/authorization/parties/current")]
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
        /// Action for mocking a response to validate the instance
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>bool</returns>
        [HttpPost]
        [Route("api/parties/validateInstantiation")]
        public IActionResult ValidateInstantiation(string org, string app)
        {
            return Content(@"{""valid"": true}");
        }

        /// <summary>
        /// Action for providing an example response to the nb text resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Nb text resource file</returns>
        [HttpGet]
        [Route("api/texts/nb")]
        public async Task<ActionResult<Models.TextResource>> Language(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            Models.TextResource textResource = await altinnAppGitRepository.GetTextV1("nb");
            return Ok(textResource);
        }

        /// <summary>
        /// Action for mocking a response to getting all text resource files
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Single text resource file</returns>
        [HttpGet]
        [Route("api/textresources")]
        public async Task<ActionResult<Models.TextResource>> TextResources(string org, string app)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            Models.TextResource textResource = await altinnAppGitRepository.GetTextV1("nb");
            return Ok(textResource);
        }

        /// <summary>
        /// Action for getting the requested datamodel as jsonschema
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="modelname">Modelname identifier which is unique within an organisation.</param>
        /// <returns>datamodel as json schema</returns>
        [HttpGet]
        [Route("api/jsonschema/{modelname}")]
        public async Task<ActionResult<string>> Datamodel(string org, string app, string modelname)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            string jsonSchemaContent = await altinnAppGitRepository.GetJsonSchema(modelname);
            return Ok(jsonSchemaContent);
        }
    }
}

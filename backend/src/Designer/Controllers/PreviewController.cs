using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using LibGit2Sharp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ApplicationLanguage = Altinn.Studio.Designer.Models.ApplicationLanguage;
using LayoutSets = Altinn.Studio.Designer.Models.LayoutSets;

namespace Altinn.Studio.Designer.Controllers
{
    /// <summary>
    /// Controller containing all actions related to preview - still under development
    /// </summary>
    [Authorize]
    [AutoValidateAntiforgeryToken]
    // Uses regex to not match on designer since the call from frontend to get the iframe for app-frontend,
    // `designer/html/preview.html`, will match on Image-endpoint which is a fetch-all route
    [Route("{org:regex(^(?!designer))}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}")]
    public class PreviewController : Controller
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IAltinnGitRepositoryFactory _altinnGitRepositoryFactory;
        private readonly ISchemaModelService _schemaModelService;
        private readonly IPreviewService _previewService;
        private readonly ITextsService _textsService;

        // This value will be overridden to act as the task number for apps that use layout sets
        private const int PartyId = 51001;

        /// <summary>
        /// Initializes a new instance of the <see cref="PreviewController"/> class.
        /// </summary>
        /// <param name="httpContextAccessor"></param>
        /// <param name="altinnGitRepositoryFactory">IAltinnGitRepositoryFactory</param>
        /// <param name="schemaModelService">Schema Model Service</param>
        /// <param name="previewService">Preview Service</param>
        /// <param name="textsService">Texts Service</param>
        /// Factory class that knows how to create types of <see cref="AltinnGitRepository"/>
        public PreviewController(IHttpContextAccessor httpContextAccessor, IAltinnGitRepositoryFactory altinnGitRepositoryFactory, ISchemaModelService schemaModelService, IPreviewService previewService, ITextsService textsService)
        {
            _httpContextAccessor = httpContextAccessor;
            _altinnGitRepositoryFactory = altinnGitRepositoryFactory;
            _schemaModelService = schemaModelService;
            _previewService = previewService;
            _textsService = textsService;
        }

        /// <summary>
        /// Default action for the preview.
        /// </summary>
        /// <returns>default view for the app preview.</returns>
        [HttpGet]
        [Route("/preview/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/{*AllValues}")]
        public IActionResult Index(string org, string app)
        {
            return View();
        }

        /// <summary>
        /// Action for getting local app-images
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="imageFilePath">A path to the image location, including file name, consisting of an arbitrary amount of directories</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The specified local app-image as Stream</returns>
        [HttpGet]
        [Route("{*imageFilePath}")]
        public FileStreamResult Image(string org, string app, string imageFilePath, CancellationToken cancellationToken)
        {

            if (imageFilePath.Contains('/'))
            {
                string imageFileName = string.Empty;
                string[] segments = imageFilePath.Split('/');

                foreach (string segment in segments)
                {
                    imageFileName = Path.Combine(imageFileName, segment);
                }

                imageFilePath = imageFileName;
            }

            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            Stream imageStream = altinnAppGitRepository.GetImage(imageFilePath);
            return new FileStreamResult(imageStream, MimeTypeMap.GetMimeType(Path.GetExtension(imageFilePath).ToLower()));
        }

        /// <summary>
        /// Action for getting the application metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The application metadata for the app</returns>
        [HttpGet]
        [Route("api/v1/applicationmetadata")]
        public async Task<ActionResult<ApplicationMetadata>> ApplicationMetadata(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(cancellationToken);
            return Ok(applicationMetadata);
        }

        /// <summary>
        /// Action for mocking a response containing the application settings
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>ApplicationSettings</returns>
        [HttpGet]
        [Route("api/v1/applicationsettings")]
        public async Task<ActionResult<ApplicationSettings>> ApplicationSettings(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(cancellationToken);
            ApplicationSettings applicationSettings = new()
            {
                Id = applicationMetadata.Id,
                Org = applicationMetadata.Org,
                Title = applicationMetadata.Title
            };
            return Ok(applicationSettings);
        }

        /// <summary>
        /// Action for getting the layout sets
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>layoutsets file, or an OK response if app does not use layoutsets</returns>
        [HttpGet]
        [Route("api/layoutsets")]
        public async Task<ActionResult<LayoutSets>> LayoutSets(string org, string app, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                LayoutSets layoutSets = await altinnAppGitRepository.GetLayoutSetsFile(cancellationToken);
                return Ok(layoutSets);
            }
            catch (NotFoundException)
            {
                return Ok();
            }

        }

        /// <summary>
        /// Action for getting the layout settings for apps without layoutsets
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>layoutsettings</returns>
        [HttpGet]
        [Route("api/layoutsettings")]
        public async Task<ActionResult<string>> LayoutSettings(string org, string app, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                JsonNode layoutSettings = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(null, cancellationToken);
                byte[] layoutSettingsContent = JsonSerializer.SerializeToUtf8Bytes(layoutSettings);
                return new FileContentResult(layoutSettingsContent, MimeTypeMap.GetMimeType(".json"));
            }
            catch (NotFoundException)
            {
                return NotFound();
            }
        }

        /// <summary>
        /// Action for getting the layout settings for apps with layout sets
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of layout set to get layout settings from</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>layoutsettings</returns>
        [HttpGet]
        [Route("api/layoutsettings/{layoutSetName}")]
        public async Task<ActionResult<string>> LayoutSettingsForStatefulApps(string org, string app, [FromRoute] string layoutSetName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                JsonNode layoutSettings = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetName, cancellationToken);
                byte[] layoutSettingsContent = JsonSerializer.SerializeToUtf8Bytes(layoutSettings);
                return new FileContentResult(layoutSettingsContent, MimeTypeMap.GetMimeType(".json"));
            }
            catch (NotFoundException)
            {
                return NotFound();
            }
        }

        /// <summary>
        /// Action for getting a response from v1/data/anonymous
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Empty object</returns>
        [HttpGet]
        [Route("api/v1/data/anonymous")]
        public IActionResult Anonymous(string org, string app)
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
        [Route("api/v1/profile/user")]
        public IActionResult CurrentUser(string org, string app)
        {
            // TODO: return actual current testuser when tenor testusers are available
            UserProfile userProfile = new()
            {
                UserId = 1024,
                UserName = "previewUser",
                PhoneNumber = "12345678",
                Email = "test@test.com",
                PartyId = PartyId,
                Party = new(),
                UserType = 0,
                ProfileSettingPreference = new() { Language = "nb" }
            };

            return Ok(userProfile);
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
            // TODO: return actual current party when tenor testusers are available
            Party party = new()
            {
                PartyId = PartyId,
                PartyTypeName = PartyType.Person,
                OrgNumber = "1",
                SSN = null,
                UnitType = "AS",
                Name = "Test Testesen",
                IsDeleted = false,
                OnlyHierarchyElementWithNoAccess = false,
                Person = new Person(),
                Organization = null,
                ChildParties = null
            };
            return Ok(party);
        }

        /// <summary>
        /// Action for mocking a response to validate the instance
        /// </summary>
        /// <returns>bool</returns>
        [HttpGet]
        [Route("api/v1/parties")]
        public ActionResult<List<Party>> AllowedToInstantiateFilter([FromQuery] string allowedToInstantiateFilter)
        {
            List<Party> parties = new() {
                new()
                {
                    PartyId = PartyId,
                    PartyTypeName = PartyType.Person,
                    OrgNumber = "1",
                    SSN = null,
                    UnitType = "AS",
                    Name = "Test Testesen",
                    IsDeleted = false,
                    OnlyHierarchyElementWithNoAccess = false,
                    Person = new Person(),
                    Organization = null,
                    ChildParties = null
                }
            };
            return Ok(parties);
        }

        /// <summary>
        /// Action for mocking a response to validate the instance
        /// </summary>
        /// <returns>bool</returns>
        [HttpPost]
        [Route("api/v1/parties/validateInstantiation")]
        public IActionResult ValidateInstantiation()
        {
            return Content(@"{""valid"": true}");
        }

        /// <summary>
        /// Action for getting the text resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="languageCode">Language code</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Nb text resource file</returns>
        [HttpGet]
        [Route("api/v1/texts/{languageCode}")]
        public async Task<ActionResult<Models.TextResource>> Language(string org, string app, string languageCode, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            Models.TextResource textResource = await altinnAppGitRepository.GetTextV1(languageCode, cancellationToken);
            return Ok(textResource);
        }

        /// <summary>
        /// Action for creating the mocked instance object
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerPartyId"></param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The mocked instance object</returns>
        [HttpPost]
        [Route("instances")]
        public async Task<ActionResult<Instance>> Instances(string org, string app, [FromQuery] int? instanceOwnerPartyId, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            Instance mockInstance = await _previewService.GetMockInstance(org, app, developer, instanceOwnerPartyId, layoutSetName, cancellationToken);
            return Ok(mockInstance);
        }

        /// <summary>
        /// Action for getting the mocked instance id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The mocked instance object</returns>
        [HttpGet]
        [Route("/designer/api/{org}/{app}/mock-instance-id")]
        public async Task<ActionResult<string>> GetInstanceId(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            Instance mockInstance = await _previewService.GetMockInstance(org, app, developer, PartyId, layoutSetName, cancellationToken);
            return Ok(mockInstance.Id);
        }

        /// <summary>
        /// Action for getting the json schema for the datamodel for the default data task test-datatask-id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="partyId">party id</param>
        /// <param name="instanceGuid">instance</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Json schema for datamodel for the current task</returns>
        [HttpGet]
        [Route("instances/{partyId}/{instanceGuid}/data/test-datatask-id")]
        public async Task<ActionResult> GetFormData(string org, string app, [FromRoute] int partyId, [FromRoute] string instanceGuid, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            DataType dataType = await _previewService.GetDataTypeForLayoutSetName(org, app, developer, layoutSetName, cancellationToken);
            // For apps that does not have a datamodel
            if (dataType == null)
            {
                Instance mockInstance = await _previewService.GetMockInstance(org, app, developer, partyId, layoutSetName, cancellationToken);
                return Ok(mockInstance.Id);
            }
            string modelPath = $"/App/models/{dataType.Id}.schema.json";
            string decodedPath = Uri.UnescapeDataString(modelPath);
            string formData = await _schemaModelService.GetSchema(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer), decodedPath, cancellationToken);
            return Ok(formData);
        }

        /// <summary>
        /// Action for updating the json schema for the datamodel for the current data task in the process
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="partyId"></param>
        /// <param name="instanceGuid"></param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Json schema for datamodel for the current data task in the process</returns>
        [HttpPut]
        [Route("instances/{partyId}/{instanceGuid}/data/test-datatask-id")]
        public async Task<ActionResult> UpdateFormData(string org, string app, [FromRoute] int partyId, [FromRoute] string instanceGuid, CancellationToken cancellationToken)
        {
            return await GetFormData(org, app, partyId, instanceGuid, cancellationToken);
        }

        /// <summary>
        /// Action for mocking upload of an attachment to an attachment component
        /// </summary>
        /// <param name="dataType">Id of the attachment component in application metadata</param>
        /// <returns>A 201 Created response with a mocked data element</returns>
        [HttpPost]
        [Route("instances/{partyId}/{instanceGuid}/data")]
        public ActionResult PostAttachment([FromQuery] string dataType)
        {
            // This guid will be the unique id of the uploaded attachment
            Guid guid = Guid.NewGuid();
            DataElement dataElement = new() { Id = guid.ToString() };
            return Created("link-to-app-placeholder", dataElement);
        }

        /// <summary>
        /// Action for mocking deleting an uploaded attachment to an attachment component
        /// </summary>
        /// <param name="dataTypeId">Id of the attachment in application metadata</param>
        /// <returns>Ok</returns>
        [HttpDelete]
        [Route("instances/{partyId}/{instanceGuid}/data/{dataTypeId}")]
        public ActionResult DeleteAttachment([FromRoute] string dataTypeId)
        {
            return Ok();
        }

        /// <summary>
        /// Action for mocking updating tags for an attachment component in the datamodel
        /// </summary>
        /// <param name="tag">The specific tag from the code list chosen for the attachment</param>
        /// <returns>Ok</returns>
        [HttpPost]
        [Route("instances/{partyId}/{instanceGuid}/data/{dataTypeId}/tags")]
        public ActionResult UpdateTagsForAttachment([FromBody] string tag)
        {
            return Created("link-to-app-placeholder", tag);
        }

        /// <summary>
        /// Action for getting a mocked response for the current task connected to the instance
        /// </summary>
        /// <returns>The processState</returns>
        [HttpGet]
        [Route("instances/{partyId}/{instanceGuId}/process")]
        public async Task<ActionResult> Process(string org, string app, [FromRoute] int partyId, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            Instance mockInstance = await _previewService.GetMockInstance(org, app, developer, partyId, layoutSetName, cancellationToken);
            return Ok(mockInstance.Process);
        }

        /// <summary>
        /// Endpoint to get instance for next process step
        /// </summary>
        /// <returns>A mocked instance object</returns>
        [HttpGet]
        [Route("instances/{partyId}/{instanceGuId}")]
        public async Task<ActionResult<Instance>> InstanceForNextTask(string org, string app, [FromRoute] int partyId, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            Instance mockInstance = await _previewService.GetMockInstance(org, app, developer, partyId, layoutSetName, cancellationToken);
            return Ok(mockInstance);
        }

        /// <summary>
        /// Endpoint to get active instances for apps with state/layout sets/multiple processes
        /// </summary>
        /// <returns>A list of a single mocked instance</returns>
        [HttpGet]
        [Route("instances/{partyId}/active")]
        public ActionResult<List<Instance>> ActiveInstancesForAppsWithLayoutSets(string org, string app, [FromRoute] int partyId)
        {
            // Simulate never having any active instances
            List<Instance> activeInstances = new();
            return Ok(activeInstances);
        }

        /// <summary>
        /// Endpoint to validate an instance
        /// </summary>
        /// <returns>Ok</returns>
        [HttpGet]
        [Route("instances/{partyId}/{instanceGuId}/validate")]
        public ActionResult ValidateInstance()
        {
            return Ok();
        }

        /// <summary>
        /// Endpoint to validate a data task for an instance
        /// </summary>
        /// <returns>Ok</returns>
        [HttpGet]
        [Route("instances/{partyId}/{instanceGuId}/data/test-datatask-id/validate")]
        public ActionResult ValidateInstanceForDataTask()
        {
            return Ok();
        }

        /// <summary>
        /// Action for getting a mocked response for the next task connected to the instance
        /// </summary>
        /// <returns>The processState object on the global mockInstance object</returns>
        [HttpGet]
        [Route("instances/{partyId}/{instanceGuId}/process/next")]
        public async Task<ActionResult> ProcessNext(string org, string app, [FromRoute] int partyId, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            Instance mockInstance = await _previewService.GetMockInstance(org, app, developer, partyId, layoutSetName, cancellationToken);
            return Ok(mockInstance.Process);
        }

        /// <summary>
        /// Action for mocking an end to the process in order to get receipt after "send inn" is pressed
        /// </summary>
        /// <returns>Process object where ended is set</returns>
        [HttpPut]
        [Route("instances/{partyId}/{instanceGuId}/process/next")]
        public async Task<ActionResult> UpdateProcessNext(string org, string app, [FromRoute] int partyId, [FromQuery] string lang, CancellationToken cancellationToken)
        {
            string refererHeader = Request.Headers["Referer"];
            string layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
            if (string.IsNullOrEmpty(layoutSetName))
            {
                string endProcess = @"{""ended"": ""ended""}";
                return Ok(endProcess);
            }
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            Instance mockInstance = await _previewService.GetMockInstance(org, app, developer, partyId, layoutSetName, cancellationToken);
            return Ok(mockInstance.Process);
        }

        /// <summary>
        /// Action for mocking a response to getting all text resources
        /// </summary>
        /// <remarks>Hardcoded to only serve norwegian bokmal resource file</remarks>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Single text resource file</returns>
        [HttpGet]
        [Route("api/v1/textresources")]
        public async Task<ActionResult<Models.TextResource>> TextResources(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(_httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            Models.TextResource textResource = await altinnAppGitRepository.GetTextV1("nb", cancellationToken);
            return Ok(textResource);
        }

        /// <summary>
        /// Action for getting the datamodel as jsonschema
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="datamodel">Datamodel used by the application</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>datamodel as json schema</returns>
        [HttpGet]
        [Route("api/jsonschema/{datamodel}")]
        public async Task<ActionResult<string>> Datamodel(string org, string app, [FromRoute] string datamodel, CancellationToken cancellationToken)
        {
            string modelPath = $"/App/models/{datamodel}.schema.json";
            string decodedPath = Uri.UnescapeDataString(modelPath);
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            string json = await _schemaModelService.GetSchema(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer), decodedPath, cancellationToken);
            return Ok(json);
        }

        /// <summary>
        /// Action for getting the form layout
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Request form layout as byte array</returns>
        [HttpGet]
        [Route("api/resource/FormLayout.json")]
        public async Task<ActionResult<Dictionary<string, JsonNode>>> GetFormLayouts(string org, string app, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            Dictionary<string, JsonNode> formLayouts = await altinnAppGitRepository.GetFormLayouts(null, cancellationToken);
            // return as byte array to imitate app backend
            byte[] formLayoutsContent = JsonSerializer.SerializeToUtf8Bytes(formLayouts);
            return new FileContentResult(formLayoutsContent, MimeTypeMap.GetMimeType(".json"));
        }

        /// <summary>
        /// Action for getting form layouts for a specific layout set
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of layout set to get layouts from</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>A List of form layouts as byte array</returns>
        [HttpGet]
        [Route("api/layouts/{layoutSetName}")]
        public async Task<ActionResult<Dictionary<string, JsonNode>>> GetFormLayoutsForStatefulApps(string org, string app, [FromRoute] string layoutSetName, CancellationToken cancellationToken)
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
            Dictionary<string, JsonNode> formLayouts = await altinnAppGitRepository.GetFormLayouts(layoutSetName, cancellationToken);
            // return as byte array to imitate app backend
            byte[] formLayoutsContent = JsonSerializer.SerializeToUtf8Bytes(formLayouts);
            return new FileContentResult(formLayoutsContent, MimeTypeMap.GetMimeType(".json"));
        }

        /// <summary>
        /// Action for getting the ruleHandler
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Rule handler as string or no content if not found</returns>
        [HttpGet]
        [Route("api/resource/RuleHandler.js")]
        public async Task<ActionResult<string>> GetRuleHandler(string org, string app, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                string ruleHandler = await altinnAppGitRepository.GetRuleHandler(null, cancellationToken);
                return Ok(ruleHandler);
            }
            catch (FileNotFoundException)
            {
                return NoContent();
            }
        }

        /// <summary>
        /// Action for getting the ruleHandler for apps with layout sets
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of layout set to get rule handler from</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Rule handler as string or no content if not found</returns>
        [HttpGet]
        [Route("api/rulehandler/{layoutSetName}")]
        public async Task<ActionResult<string>> GetRuleHandlerStateful(string org, string app, [FromRoute] string layoutSetName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                string ruleHandler = await altinnAppGitRepository.GetRuleHandler(layoutSetName, cancellationToken);
                return Ok(ruleHandler);
            }
            catch (FileNotFoundException)
            {
                return NoContent();
            }
        }

        /// <summary>
        /// Action for getting the ruleConfiguration
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Rule configuration as string or no content if not found</returns>
        [HttpGet]
        [Route("api/resource/RuleConfiguration.json")]
        public async Task<ActionResult<string>> GetRuleConfiguration(string org, string app, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                string ruleConfig = await altinnAppGitRepository.GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(null, cancellationToken);
                return Ok(ruleConfig);
            }
            catch (FileNotFoundException)
            {
                return NoContent();
            }
        }

        /// <summary>
        /// Action for getting the ruleConfiguration for apps with layout sets
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="layoutSetName">Name of layout set to get rule config from</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>Rule configuration as string or no content if not found</returns>
        [HttpGet]
        [Route("api/ruleconfiguration/{layoutSetName}")]
        public async Task<ActionResult<string>> GetRuleConfigurationStateful(string org, string app, [FromRoute] string layoutSetName, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                string ruleConfig = await altinnAppGitRepository.GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(layoutSetName, cancellationToken);
                return Ok(ruleConfig);
            }
            catch (FileNotFoundException)
            {
                return NoContent();
            }
        }

        /// <summary>
        /// Action for getting application languages
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>List of application languages in the format [{language: "nb"}, {language: "en"}]</returns>
        [HttpGet]
        [Route("api/v1/applicationlanguages")]
        public ActionResult<IList<string>> GetApplicationLanguages(string org, string app)
        {
            try
            {
                List<ApplicationLanguage> applicationLanguages = new();
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                IList<string> languages = _textsService.GetLanguages(org, app, developer);
                foreach (string language in languages)
                {
                    applicationLanguages.Add(new ApplicationLanguage() { Language = language });
                }
                return Ok(applicationLanguages);
            }
            catch (NotFoundException)
            {
                return NoContent();
            }

        }

        /// <summary>
        /// Action for getting options list for a given options list id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="optionListId">The id of the options list</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The options list if it exists, otherwise nothing</returns>
        [HttpGet]
        [Route("api/options/{optionListId}")]
        public async Task<ActionResult<string>> GetOptions(string org, string app, string optionListId, CancellationToken cancellationToken)
        {
            try
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                string options = await altinnAppGitRepository.GetOptions(optionListId, cancellationToken);
                return Ok(options);
            }
            catch (NotFoundException)
            {
                return NoContent();
            }
        }

        /// <summary>
        /// Action for getting options list for a given options list id for a given instance
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="optionListId">The id of the options list</param>
        /// <param name="language">The language for the options list</param>
        /// <param name="source">The source of the options list</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The options list if it exists, otherwise nothing</returns>
        [HttpGet]
        [Route("instances/{partyId}/{instanceGuid}/options/{optionListId}")]
        public async Task<ActionResult<string>> GetOptionsForInstance(string org, string app, string optionListId, [FromQuery] string language, [FromQuery] string source, CancellationToken cancellationToken)
        {
            try
            {
                // TODO: Need code to get dynamic options list based on language and source?
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = _altinnGitRepositoryFactory.GetAltinnAppGitRepository(org, app, developer);
                string options = await altinnAppGitRepository.GetOptions(optionListId, cancellationToken);
                return Ok(options);
            }
            catch (NotFoundException)
            {
                // Return empty list since app-frontend don't handle a null result
                return Ok(new List<string>());
            }
        }

        /// <summary>
        /// Action for getting data list for a given data list id for a given instance
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="dataListId">The id of the data list</param>
        /// <param name="language">The language for the data list</param>
        /// <param name="size">The number of items to return</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>The options list if it exists, otherwise nothing</returns>
        [HttpGet]
        [Route("instances/{partyId}/{instanceGuid}/datalists/{dataListId}")]
        public async Task<ActionResult<List<string>>> GetDatalistsForInstance(string org, string app, string dataListId, [FromQuery] string language, [FromQuery] string size, CancellationToken cancellationToken)
        {
            // TODO: Should look into whether we can get some actual data here, or if we can make an "informed" mock based on the setup.
            // For now, we just return an empty list.
            return Ok(new List<string>());
        }

        /// <summary>
        /// Action for updating data model with tag for attachment component // TODO: Figure out what actually happens here
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="currentPage">Current page in running app</param>
        /// <param name="layoutSetId">Current layout set in running app</param>
        /// <param name="dataTypeId">Connected datatype for that process task</param>
        /// <returns>The options list if it exists, otherwise nothing</returns>
        [HttpPost]
        [Route("instances/{partyId}/{instanceGuid}/pages/order")]
        public IActionResult UpdateAttachmentWithTag(string org, string app, [FromQuery] string currentPage, [FromQuery] string layoutSetId, [FromQuery] string dataTypeId)
        {
            return Ok();
        }

        private string GetSelectedLayoutSetInEditorFromRefererHeader(string refererHeader)
        {
            Uri refererUri = new(refererHeader);
            string layoutSetName = HttpUtility.ParseQueryString(refererUri.Query)["selectedLayoutSet"];

            return string.IsNullOrEmpty(layoutSetName) ? null : layoutSetName;
        }
    }
}

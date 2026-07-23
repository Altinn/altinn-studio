using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Exceptions.SharedContent;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Helpers.Preview;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using LibGit2Sharp;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ApplicationLanguage = Altinn.Studio.Designer.Models.ApplicationLanguage;

namespace Altinn.Studio.Designer.Controllers;

/// <summary>
/// Controller containing all actions related to preview - still under development
/// </summary>
/// <remarks>
/// Initializes a new instance of the <see cref="PreviewController"/> class.
/// </remarks>
/// <param name="httpContextAccessor"></param>
/// <param name="altinnGitRepositoryFactory">IAltinnGitRepositoryFactory</param>
/// <param name="schemaModelService">Schema Model Service</param>
/// <param name="previewService">Preview Service</param>
/// <param name="textsService">Texts Service</param>
/// <param name="sharedContentClient">Shared Content Client</param>
/// <param name="appVersionService">App Version Service</param>
/// Factory class that knows how to create types of <see cref="AltinnGitRepository"/>
[ApiController]
[Authorize]
[AutoValidateAntiforgeryToken]
// Uses regex to not match on designer since the call from frontend to get the iframe for app-frontend,
// `designer/html/preview.html`, will match on Image-endpoint which is a fetch-all route
[Route(
    "{org:regex(^(?!(designer|editor|dashboard|preview|admin|resourceadm|info|settings)$).+$)}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}"
)]
public partial class PreviewController(
    IHttpContextAccessor httpContextAccessor,
    IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
    ISchemaModelService schemaModelService,
    IPreviewService previewService,
    ITextsService textsService,
    ISharedContentClient sharedContentClient,
    IAppVersionService appVersionService
) : Controller
{
    // This value will be overridden to act as the task number for apps that use layout sets
    private const int PartyId = 51001;

    // Base URL where Designer serves the app-frontend bundle for v9 previews (see Designer Dockerfile:
    // the bundle is copied into wwwroot/altinn-app-frontend/). Mirrors the app backend's asset base URL.
    private const string V9PreviewAssetBaseUrl = "/altinn-app-frontend";

    // Matches how the app backend (IndexPageGenerator) serializes the global bootstrap state:
    // camelCase property names and null values omitted. The default (HTML-safe) encoder is kept so the
    // JSON can be embedded directly inside a <script> tag.
    private static readonly JsonSerializerOptions s_appGlobalDataJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>
    /// Default action for the preview.
    /// </summary>
    /// <returns>default view for the app preview.</returns>
    [HttpGet]
    [Route("/preview/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}/{*AllValues}")]
    public IActionResult Index(string org, string app)
    {
        ViewBag.App = "app-preview";
        return View();
    }

    /// <summary>
    /// Endpoint to fetch the cshtml to render app-frontend specific to what is defined in the app-repo
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The cshtml modified to ignore this route path added in the iframe.</returns>
    [HttpGet]
    [Route("/app-specific-preview/{org}/{app:regex(^(?!datamodels$)[[a-z]][[a-z0-9-]]{{1,28}}[[a-z0-9]]$)}")]
    public async Task<IActionResult> AppFrontendSpecificPreview(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);

        // v9 apps are no longer served via a static index.cshtml. The app backend's HomeController now
        // generates the HTML itself and injects the global bootstrap state (window.altinnAppGlobalData)
        // that app-frontend reads on load. We mirror that here for the preview, serving the app-frontend
        // bundle that Designer hosts at /altinn-app-frontend/ (see IndexPageGenerator in the app backend).
        if (appVersionService.IsV9App(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer)))
        {
            string html = await GenerateV9PreviewIndexHtml(org, app, developer, cancellationToken);
            return Content(html, "text/html; charset=utf-8");
        }

        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            org,
            app,
            developer
        );
        var appFrontendCshtml = await altinnAppGitRepository.GetAppFrontendCshtml();
        var modifiedContent = ReplaceIndexToFetchCorrectOrgAppInCshtml(appFrontendCshtml);

        return Content(modifiedContent, "text/html");
    }

    /// <summary>
    /// Serves the generated v9 preview index HTML for app-frontend's client-side (history) routes.
    /// v9 app-frontend uses browser routing with basename /{org}/{app}, so after the initial hash-route
    /// redirect the browser requests real paths like /{org}/{app}/instance/{partyId}/{instanceGuid}/...
    /// These must return the same index HTML (mirroring the app backend's HomeController) rather than
    /// being treated as image requests by the catch-all route below.
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The generated v9 preview index HTML, or NotFound for non-v9 apps.</returns>
    [HttpGet]
    [Route("")]
    [Route("instance-selection")]
    [Route("party-selection")]
    [Route("party-selection/{errorCode}")]
    [Route("{pageName:int}")]
    [Route("instance/{partyId}/{instanceGuid}")]
    [Route("instance/{partyId}/{instanceGuid}/{*rest}")]
    public async Task<IActionResult> V9PreviewClientRoute(string org, string app, CancellationToken cancellationToken)
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        if (!appVersionService.IsV9App(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer)))
        {
            return NotFound();
        }

        string html = await GenerateV9PreviewIndexHtml(org, app, developer, cancellationToken);
        return Content(html, "text/html; charset=utf-8");
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

        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            org,
            app,
            developer
        );
        Stream imageStream = altinnAppGitRepository.GetImageAsStreamByFilePath(imageFilePath);
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
    public async Task<ActionResult<ApplicationMetadata>> ApplicationMetadata(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            org,
            app,
            developer
        );
        ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(
            cancellationToken
        );
        string appNugetVersionString = appVersionService
            .GetAppLibVersion(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer))
            .ToString();
        // This property is populated at runtime by the apps, so we need to mock it here
        applicationMetadata.AltinnNugetVersion = NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion(
            appNugetVersionString
        );
        applicationMetadata = SetMockedPartyTypesAllowedAsAllFalse(applicationMetadata);
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
    public async Task<ActionResult<ApplicationSettings>> ApplicationSettings(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            org,
            app,
            developer
        );
        ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(
            cancellationToken
        );
        ApplicationSettings applicationSettings = new()
        {
            Id = applicationMetadata.Id,
            Org = applicationMetadata.Org,
            Title = applicationMetadata.Title,
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
    [UseSystemTextJson]
    [Route("api/layoutsets")]
    public async Task<ActionResult<LayoutSets>> LayoutSets(string org, string app, CancellationToken cancellationToken)
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org,
                app,
                developer
            );
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
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org,
                app,
                developer
            );
            JsonNode layoutSettings = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                null,
                cancellationToken
            );
            AddPdfLayoutNameToPageOrder(layoutSettings);
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
    public async Task<ActionResult<string>> LayoutSettingsForV4Apps(
        string org,
        string app,
        [FromRoute] string layoutSetName,
        CancellationToken cancellationToken
    )
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org,
                app,
                developer
            );
            JsonNode layoutSettings = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                layoutSetName,
                cancellationToken
            );
            AddPdfLayoutNameToPageOrder(layoutSettings);
            byte[] layoutSettingsContent = JsonSerializer.SerializeToUtf8Bytes(layoutSettings);
            return new FileContentResult(layoutSettingsContent, MimeTypeMap.GetMimeType(".json"));
        }
        catch (NotFoundException)
        {
            return NotFound();
        }
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
    /// Action for getting a response from v1/data/anonymous
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <returns>Empty object</returns>
    [HttpGet]
    [Route("api/v1/data/anonymous")]
    public IActionResult Anonymous(string org, string app)
    {
        string user = "{}";
        return Content(user);
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
        return Ok(BuildMockPreviewUserProfile());
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
        return Ok(BuildMockPreviewParty());
    }

    /// <summary>
    /// Action for mocking a response to validate the instance
    /// </summary>
    /// <returns>bool</returns>
    [HttpGet]
    [Route("api/v1/parties")]
    [UseSystemTextJson]
    public ActionResult<List<Party>> AllowedToInstantiateFilter([FromQuery] string? allowedToInstantiateFilter)
    {
        List<Party> parties = new()
        {
            new()
            {
                PartyId = PartyId,
                PartyTypeName = PartyType.Person,
                Name = "Test Testesen",
                SSN = "11223344556",
                IsDeleted = false,
                OnlyHierarchyElementWithNoAccess = false,
                Person = new Person(),
            },
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
        return Content("""{"valid": true}""");
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
    public async Task<ActionResult<Models.TextResource>> Language(
        string org,
        string app,
        string languageCode,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            org,
            app,
            developer
        );
        Models.TextResource textResource = await altinnAppGitRepository.GetText(languageCode, cancellationToken);
        return Ok(textResource);
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
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        string? refererHeader = Request.Headers["Referer"];
        string? layoutSetName = GetSelectedLayoutSetInEditorFromRefererHeader(refererHeader);
        Instance mockInstance = await previewService.GetMockInstance(
            org,
            app,
            developer,
            PartyId,
            layoutSetName,
            cancellationToken
        );
        return Ok(mockInstance.Id);
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
    public async Task<ActionResult<Models.TextResource>> TextResources(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            org,
            app,
            developer
        );
        Models.TextResource textResource = await altinnAppGitRepository.GetText("nb", cancellationToken);
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
    public async Task<ActionResult<string>> Datamodel(
        string org,
        string app,
        [FromRoute] string datamodel,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        string modelPath = $"/App/models/{datamodel}.schema.json";
        if (datamodel.StartsWith(PreviewService.MockDataModelIdPrefix))
        {
            // If app-frontend tries to fetch a datamodel for a mockDataModelId we will return the first
            // datamodel in appMetadata since our mocked preview will not use this datamodel anyway, but
            // app-frontend expects an actual datamodel as a response
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org,
                app,
                developer
            );
            ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(
                cancellationToken
            );
            string existingDataTypeId = applicationMetadata
                .DataTypes.First(dataType => dataType.AppLogic?.ClassRef is not null)
                .Id;
            modelPath = $"/App/models/{existingDataTypeId}.schema.json";
        }

        string decodedPath = Uri.UnescapeDataString(modelPath);
        string json = await schemaModelService.GetSchema(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer),
            decodedPath,
            cancellationToken
        );
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
    public async Task<ActionResult<Dictionary<string, JsonNode>>> GetFormLayouts(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            org,
            app,
            developer
        );
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
    public async Task<ActionResult<Dictionary<string, JsonNode>>> GetFormLayoutsForV4Apps(
        string org,
        string app,
        [FromRoute] string layoutSetName,
        CancellationToken cancellationToken
    )
    {
        string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            org,
            app,
            developer
        );
        Dictionary<string, JsonNode> formLayouts = await altinnAppGitRepository.GetFormLayouts(
            layoutSetName,
            cancellationToken
        );
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
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org,
                app,
                developer
            );
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
    public async Task<ActionResult<string>> GetRuleHandlerV4(
        string org,
        string app,
        [FromRoute] string layoutSetName,
        CancellationToken cancellationToken
    )
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org,
                app,
                developer
            );
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
    public async Task<ActionResult<string>> GetRuleConfiguration(
        string org,
        string app,
        CancellationToken cancellationToken
    )
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org,
                app,
                developer
            );
            string ruleConfig = await altinnAppGitRepository.GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(
                null,
                cancellationToken
            );
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
    public async Task<ActionResult<string>> GetRuleConfigurationV4(
        string org,
        string app,
        [FromRoute] string layoutSetName,
        CancellationToken cancellationToken
    )
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org,
                app,
                developer
            );
            string ruleConfig = await altinnAppGitRepository.GetRuleConfigAndAddDataToRootIfNotAlreadyPresent(
                layoutSetName,
                cancellationToken
            );
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
            IList<string> languages = textsService.GetLanguages(org, app, developer);
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
    /// <param name="optionsListIdOrLibraryRef">The id or reference to the options list</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>The options list if it exists, otherwise nothing</returns>
    [HttpGet]
    [Route("api/options/{optionsListIdOrLibraryRef}")]
    public async Task<ActionResult<string>> GetOptions(
        string org,
        string app,
        string optionsListIdOrLibraryRef,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var libRefMatch = LibraryRefRegex().Match(optionsListIdOrLibraryRef);
            if (libRefMatch.Success)
            {
                var codeList = await sharedContentClient.GetPublishedCodeListForOrg(
                    libRefMatch.Groups["org"].Value,
                    libRefMatch.Groups["codeListId"].Value,
                    libRefMatch.Groups["version"].Value,
                    cancellationToken
                );

                var optionsList = MapToOptions(codeList);
                return JsonSerializer.Serialize(optionsList);
            }
            else
            {
                string developer = AuthenticationHelper.GetDeveloperUserName(HttpContext);
                AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    org,
                    app,
                    developer
                );

                string options = await altinnAppGitRepository.GetOptionsList(
                    optionsListIdOrLibraryRef,
                    cancellationToken
                );
                return Ok(options);
            }
        }
        catch (Exception ex) when (ex is NotFoundException or SharedContentRequestException)
        {
            // Return empty list since app-frontend don't handle a null result
            return Ok(new List<string>());
        }
    }

    /// <summary>
    /// Action for mocking the GET method for app footer
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
    /// <returns>Empty response</returns>
    [HttpGet]
    [Route("api/v1/footer")]
    public async Task<ActionResult<FooterFile>> Footer(string org, string app, CancellationToken cancellationToken)
    {
        try
        {
            string developer = AuthenticationHelper.GetDeveloperUserName(httpContextAccessor.HttpContext);
            AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                org,
                app,
                developer
            );
            FooterFile footerFile = await altinnAppGitRepository.GetFooter(cancellationToken);
            return Ok(footerFile);
        }
        catch (FileNotFoundException)
        {
            return Ok();
        }
    }

    /// <summary>
    /// Action for mocking the GET method for app validation config
    /// </summary>
    /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
    /// <param name="app">Application identifier which is unique within an organisation.</param>
    /// <param name="modelname">The name of the model to validate</param>
    /// <returns>Empty response</returns>
    [HttpGet]
    [Route("api/validationconfig/{modelname}")]
    public IActionResult ValidationConfig(string org, string app, string modelname)
    {
        return Ok();
    }

    /// <summary>
    /// Action for mocking the GET method for organisation lookup for v4 apps
    /// </summary>
    /// <param name="org">The org</param>
    /// <param name="app">The app</param>
    /// <param name="organisationNumber">The organisation number to lookup</param>
    /// <returns></returns>
    [HttpGet]
    [Route("api/v1/lookup/organisation/{organisationNumber}")]
    public IActionResult OrganisationLookup(string org, string app, string organisationNumber)
    {
        string lookupResponse =
            $"{{\"success\":true,\"organisationDetails\":{{\"orgNr\":\"{organisationNumber}\",\"name\":\"Test AS (preview)\"}}}}";
        return Ok(lookupResponse);
    }

    /// <summary>
    /// Action for mocking the POST method for person lookup for v4 apps
    /// </summary>
    /// <param name="org">The org</param>
    /// <param name="app">The app</param>
    /// <returns></returns>
    [HttpPost]
    [Route("api/v1/lookup/person")]
    public IActionResult PersonLookup(string org, string app)
    {
        string mockSsn = "12345678912";
        string lookupResponse =
            $"{{\"success\":true,\"personDetails\":{{\"ssn\":\"{mockSsn}\",\"name\":\"Test T. Testesen (preview)\", \"lastName\":\"Testesen (preview)\"}}}}";
        return Ok(lookupResponse);
    }

    private static List<Option> MapToOptions(CodeList? libraryCodeListResponse)
    {
        if (libraryCodeListResponse?.Codes == null)
        {
            return [];
        }

        return libraryCodeListResponse
            .Codes.Select(code =>
            {
                return new Option
                {
                    Value = code.Value,
                    Label = GetValueWithLanguageFallback(code.Label),
                    Description = GetValueWithLanguageFallback(code.Description),
                    HelpText = GetValueWithLanguageFallback(code.HelpText),
                };
            })
            .ToList();
    }

    /// <summary>
    /// Gets a value from a language collection.
    /// Attempts to find a value in this order: Nb, Nn, En, then first available (alphabetically by key).
    /// </summary>
    private static string? GetValueWithLanguageFallback(Dictionary<string, string>? languageCollection)
    {
        if (languageCollection == null)
        {
            return null;
        }

        if (languageCollection.Count == 0)
        {
            return string.Empty;
        }

        if (
            languageCollection.TryGetValue(LanguageConst.Nb, out string? value)
            || languageCollection.TryGetValue(LanguageConst.Nn, out value)
            || languageCollection.TryGetValue(LanguageConst.En, out value)
        )
        {
            return value;
        }

        return languageCollection.OrderBy(x => x.Key).First().Value;
    }

    /// <summary>
    /// Adds the pdfLayoutName to pages.order in the layout settings for preview purposes.
    /// The actual Settings.json file is not modified.
    /// </summary>
    /// <param name="layoutSettings">The layout settings JsonNode to modify in-place.</param>
    private static void AddPdfLayoutNameToPageOrder(JsonNode layoutSettings)
    {
        JsonObject? pagesObject = layoutSettings?["pages"] as JsonObject;
        string? pdfLayoutName = pagesObject?["pdfLayoutName"]?.GetValue<string>();
        if (string.IsNullOrEmpty(pdfLayoutName))
        {
            return;
        }

        if (pagesObject?["groups"] is JsonArray groups)
        {
            JsonObject? lastGroupWithOrder = groups.OfType<JsonObject>().LastOrDefault(g => g["order"] is JsonArray);

            if (lastGroupWithOrder?["order"] is JsonArray groupOrder)
            {
                bool alreadyInOrder = groupOrder.Any(item => item?.GetValue<string>() == pdfLayoutName);
                if (!alreadyInOrder)
                {
                    groupOrder.Add(JsonValue.Create(pdfLayoutName));
                }
                return;
            }
        }

        if (pagesObject?["order"] is JsonArray order)
        {
            bool alreadyInOrder = order.Any(item => item?.GetValue<string>() == pdfLayoutName);
            if (!alreadyInOrder)
            {
                order.Add(JsonValue.Create(pdfLayoutName));
            }
        }
    }

    private static string? GetSelectedLayoutSetInEditorFromRefererHeader(string? refererHeader)
    {
        Uri refererUri = new(refererHeader!);
        string? layoutSetName = HttpUtility.ParseQueryString(refererUri.Query)["selectedLayoutSet"];

        return string.IsNullOrEmpty(layoutSetName) ? null : layoutSetName;
    }

    /// <summary>
    /// Generates the index HTML for a v9 app preview, mirroring the app backend's IndexPageGenerator:
    /// an app-frontend mount point plus the global bootstrap state injected onto the window object.
    /// </summary>
    private async Task<string> GenerateV9PreviewIndexHtml(
        string org,
        string app,
        string developer,
        CancellationToken cancellationToken
    )
    {
        string globalDataJson = await BuildAppGlobalDataJson(org, app, developer, cancellationToken);

        // Feature toggles are not configurable from the preview yet; app-frontend treats {} as "all defaults".
        const string FeatureTogglesJson = "{}";

        return $$"""
            <!DOCTYPE html>
            <html lang="no">
            <head>
              <meta charset="utf-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
              <title>{{org}} - {{app}}</title>
              <link rel="icon" href="/favicon.ico">
              <link rel="stylesheet" type="text/css" href="{{V9PreviewAssetBaseUrl}}/altinn-app-frontend.css">
            </head>
            <body>
              <div id="root"></div>
              <script>
                window.org = '{{org}}';
                window.app = '{{app}}';
                window.featureToggles = {{FeatureTogglesJson}};
                window.altinnAppGlobalData = {{globalDataJson}};
              </script>
              <script src="{{V9PreviewAssetBaseUrl}}/altinn-app-frontend.js" crossorigin></script>
            </body>
            </html>
            """;
    }

    /// <summary>
    /// Builds the global bootstrap state (window.altinnAppGlobalData) for a v9 preview, mirroring the
    /// app backend's BootstrapGlobalService. Reuses the same mocked data the preview endpoints already
    /// expose; fields without a preview source yet are provided as safe defaults.
    /// </summary>
    private async Task<string> BuildAppGlobalDataJson(
        string org,
        string app,
        string developer,
        CancellationToken cancellationToken
    )
    {
        AltinnAppGitRepository altinnAppGitRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(
            org,
            app,
            developer
        );

        ApplicationMetadata applicationMetadata = await altinnAppGitRepository.GetApplicationMetadata(
            cancellationToken
        );
        string appNugetVersionString = appVersionService
            .GetAppLibVersion(AltinnRepoEditingContext.FromOrgRepoDeveloper(org, app, developer))
            .ToString();
        applicationMetadata.AltinnNugetVersion = NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion(
            appNugetVersionString
        );
        applicationMetadata = SetMockedPartyTypesAllowedAsAllFalse(applicationMetadata);
        // The app backend defaults OnEntry when it is missing (see AppMetadata.cs). Mirror that here so
        // app-frontend's useIsStateless (which reads onEntry.show) does not crash for apps without one.
        applicationMetadata.OnEntry ??= new Altinn.App.Core.Models.OnEntry { Show = "new-instance" };

        Models.TextResource? textResources = await TryGetTextResources(altinnAppGitRepository, cancellationToken);
        List<ApplicationLanguage> availableLanguages = GetAvailableLanguages(org, app, developer);
        // Serve the raw footer JSON so app-frontend gets the authored icon casing (e.g. "information");
        // the typed FooterFile mangles enum values under System.Text.Json.
        JsonNode footer = await altinnAppGitRepository.GetFooterAsJsonNode(cancellationToken);
        JsonObject ui = await BuildUiConfigurationNode(altinnAppGitRepository, cancellationToken);

        var appGlobalData = new
        {
            applicationMetadata,
            textResources,
            availableLanguages,
            ui,
            footer,
            // Provided as defaults for now - app-frontend needs these present to bootstrap, but the
            // preview has no source for them yet (see BootstrapGlobalService for the runtime values).
            frontendSettings = new Dictionary<string, string>(),
            // Standard platform brand/static-asset URLs (same defaults every app uses, see
            // PlatformFrontendSettings in the app backend). These are CDN-hosted brand assets, distinct
            // from the app-frontend bundle Designer self-hosts. app-frontend fetches the logo SVG from
            // altinnLogoUrl on load, so it must be a real URL.
            platformFrontendSettings = new
            {
                altinnLogoUrl = "https://altinncdn.no/img/Altinn-logo-blue.svg",
                helpCircleIllustrationUrl = "https://altinncdn.no/img/illustration-help-circle.svg",
                postalCodesUrl = "https://altinncdn.no/postcodes/registry.json",
            },
            returnUrl = (string?)null,
            userProfile = BuildMockPreviewUserProfile(),
            selectedParty = BuildMockPreviewParty(),
            orgName = (object?)null,
            orgLogoUrl = (string?)null,
        };

        return JsonSerializer.Serialize(appGlobalData, s_appGlobalDataJsonOptions);
    }

    /// <summary>
    /// Builds the UI configuration (window.altinnAppGlobalData.ui) by mirroring the app backend's
    /// AppResourcesSI.GetUiConfiguration: the Settings.json for every layout set folder, keyed by folder
    /// name, plus the global settings from App/ui/Settings.json.
    /// </summary>
    private async Task<JsonObject> BuildUiConfigurationNode(
        AltinnAppGitRepository altinnAppGitRepository,
        CancellationToken cancellationToken
    )
    {
        JsonObject folders = new();
        IEnumerable<string> uiFolders;
        try
        {
            uiFolders = await altinnAppGitRepository.GetUiFolders(cancellationToken);
        }
        catch (NotFoundException)
        {
            uiFolders = [];
        }

        foreach (string folder in uiFolders)
        {
            JsonNode layoutSettings = await altinnAppGitRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                folder,
                cancellationToken
            );
            AddPdfLayoutNameToPageOrder(layoutSettings);
            folders[folder] = layoutSettings;
        }

        UiSettings globalSettings = await altinnAppGitRepository.GetGlobalSettingsFile(cancellationToken);
        JsonNode? settingsNode = globalSettings is null
            ? null
            : JsonSerializer.SerializeToNode(globalSettings, s_appGlobalDataJsonOptions);

        return new JsonObject { ["folders"] = folders, ["settings"] = settingsNode };
    }

    private static async Task<Models.TextResource?> TryGetTextResources(
        AltinnAppGitRepository altinnAppGitRepository,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return await altinnAppGitRepository.GetText("nb", cancellationToken);
        }
        catch (FileNotFoundException)
        {
            return null;
        }
    }

    private List<ApplicationLanguage> GetAvailableLanguages(string org, string app, string developer)
    {
        try
        {
            return textsService
                .GetLanguages(org, app, developer)
                .Select(language => new ApplicationLanguage { Language = language })
                .ToList();
        }
        catch (NotFoundException)
        {
            return [];
        }
    }

    private static UserProfile BuildMockPreviewUserProfile()
    {
        // TODO: return actual current testuser when tenor testusers are available
        return new UserProfile
        {
            UserId = 1024,
            UserName = "previewUser",
            PhoneNumber = "12345678",
            Email = "test@test.com",
            PartyId = PartyId,
            Party = new(),
            UserType = 0,
            ProfileSettingPreference = new() { Language = "nb" },
        };
    }

    private static Party BuildMockPreviewParty()
    {
        // TODO: return actual current party when tenor testusers are available
        return new Party
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
            ChildParties = null,
        };
    }

    private static string ReplaceIndexToFetchCorrectOrgAppInCshtml(string originalContent)
    {
        // Replace the array indexes in the script in the cshtml that retrieves the org and app name since
        // /app-specific-preview/ is added when fetching the cshtml file from endpoint instead of designer wwwroot
        string modifiedContent = originalContent.Replace("window.org = appId[1];", "window.org = appId[2];");
        modifiedContent = modifiedContent.Replace("window.app = appId[2];", "window.app = appId[3];");

        return modifiedContent;
    }

    /// <summary>
    /// Method to override the partyTypesAllowed in app metadata to bypass the check in app-frontend for a valid party during instantiation.
    /// </summary>
    /// <returns>The altered app metadata with all partyTypes set to false</returns>
    private static ApplicationMetadata SetMockedPartyTypesAllowedAsAllFalse(ApplicationMetadata applicationMetadata)
    {
        applicationMetadata.PartyTypesAllowed.Person = false;
        applicationMetadata.PartyTypesAllowed.Organisation = false;
        applicationMetadata.PartyTypesAllowed.SubUnit = false;
        applicationMetadata.PartyTypesAllowed.BankruptcyEstate = false;

        return applicationMetadata;
    }

    [GeneratedRegex(@"^lib\*\*(?<org>[a-zA-Z0-9]+)\*\*(?<codeListId>[a-zA-Z0-9_-]+)\*\*(?<version>[a-zA-Z0-9._-]+)$")]
    private static partial Regex LibraryRefRegex();
}

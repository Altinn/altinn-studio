using System.Globalization;
using System.Net;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Testing;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Result;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Api.Controllers;

/// <summary>A
/// Provides access to the default home view.
/// </summary>
public class HomeController : Controller
{
    private const string ALTINN_CDN_URL = "https://altinncdn.no";
    private const string APP_FRONTEND_CDN_URL = $"{ALTINN_CDN_URL}/toolkits/altinn-app-frontend";
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly IAntiforgery _antiforgery;
    private readonly IWebHostEnvironment _env;
    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly IInitialDataService _initialDataService;
    private readonly GeneralSettings _generalSettings;
    private readonly List<string> _onEntryWithInstance = ["new-instance", "select-instance"];
    private readonly IAuthenticationContext _authenticationContext;
    private readonly IInstanceClient _instanceClient;
    private readonly ILogger<HomeController> _logger;

    /// <summary>
    /// Initialize a new instance of the <see cref="HomeController"/> class.
    /// </summary>
    /// <param name="antiforgery">The anti forgery service.</param>
    /// <param name="env">The current environment.</param>
    /// <param name="appResources">The application resources service</param>
    /// <param name="appMetadata">The application metadata service</param>
    /// <param name="initialDataService">The initial data service</param>
    /// <param name="generalSettings">The general settings</param>
    /// <param name="authenticationContext">The authentication context service</param>
    /// <param name="instanceClient">The instance client service</param>
    /// <param name="logger">The logger</param>
    public HomeController(
        IAntiforgery antiforgery,
        IWebHostEnvironment env,
        IAppResources appResources,
        IAppMetadata appMetadata,
        IInitialDataService initialDataService,
        IOptions<GeneralSettings> generalSettings,
        IAuthenticationContext authenticationContext,
        IInstanceClient instanceClient,
        ILogger<HomeController> logger
    )
    {
        _antiforgery = antiforgery;
        _env = env;
        _appResources = appResources;
        _appMetadata = appMetadata;
        _initialDataService = initialDataService;
        _generalSettings = generalSettings.Value;
        _authenticationContext = authenticationContext;
        _instanceClient = instanceClient;
        _logger = logger;
    }

    /// <summary>
    /// Shows error page with appropriate status code.
    /// </summary>
    /// <param name="org">The application owner short name</param>
    /// <param name="app">The name of the app</param>
    /// <returns>HTML of the error page</returns>
    [HttpGet]
    [Route("{org}/{app}/error")]
    public async Task<IActionResult> ErrorPage([FromRoute] string org, [FromRoute] string app)
    {
        var language = Request.Query["lang"].FirstOrDefault() ?? GetLanguageFromHeader();
        var initialData = await _initialDataService.GetInitialData(org, app, language);

        var html = GenerateHtmlWithInitialData(org, app, initialData);
        return Content(html, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Main entry point for the application. Handles authentication, party selection, and routing to appropriate views.
    /// </summary>
    /// <param name="org">The application owner short name</param>
    /// <param name="app">The name of the app</param>
    /// <param name="skipPartySelection">If true, skips party selection prompt even when PromptForParty is 'always'.</param>
    /// <param name="forceNewInstance">If true, forces creation of a new instance even when existing instances are found.</param>
    [HttpGet]
    [Route("{org}/{app}/")]
    public async Task<IActionResult> Index(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] bool skipPartySelection = false,
        [FromQuery] bool forceNewInstance = false
    )
    {
        // Use InitialDataService to get data with mock integration
        var initialData = await _initialDataService.GetInitialData(org, app);
        ApplicationMetadata appMetadata = initialData.ApplicationMetadata;

        if (UserCanSeeStatelessApp(appMetadata) && await AllowAnonymous())
        {
            var statelessAppHtml = GenerateHtmlWithInitialData(org, app, initialData);
            return Content(statelessAppHtml);
        }

        var validationResult = await ValidateUserAccessAsync();
        if (!validationResult.Success)
        {
            return validationResult.Error;
        }
        SetXsrfTokenCookie();

        var (user, userDetails) = validationResult.Ok;

        if (userDetails.PartiesAllowedToInstantiate.Count == 0)
        {
            return RedirectToErrorPage(org, app, HttpStatusCode.Forbidden);
        }

        if (!userDetails.CanRepresentParty(userDetails.Profile.PartyId))
        {
            return RedirectToErrorPage(org, app, HttpStatusCode.Forbidden);
        }

        var layoutSets = GetLayoutSetsFromResources();
        string layoutSetsJson = layoutSets is not null
            ? JsonSerializer.Serialize(layoutSets, _jsonSerializerOptions)
            : "null";
        var instanceCreationHtml = GenerateInstanceCreationHtml(
            org,
            app,
            userDetails.SelectedParty.PartyId,
            layoutSetsJson
        );

        if (forceNewInstance)
        {
            return Content(instanceCreationHtml, "text/html; charset=utf-8");
        }

        if (userDetails.PartiesAllowedToInstantiate.Count > 1 && !skipPartySelection)
        {
            if (appMetadata.PromptForParty == "always")
            {
                return Redirect($"/{org}/{app}/party-selection/explained");
            }
            if (!userDetails.Profile.ProfileSettingPreference.DoNotPromptForParty)
            {
                return Redirect($"/{org}/{app}/party-selection/explained");
            }
        }

        if (IsStatelessApp(appMetadata))
        {
            if (!UserCanSeeStatelessApp(appMetadata))
            {
                return RedirectToErrorPage(org, app, HttpStatusCode.Forbidden);
            }

            var language = Request.Query["lang"].FirstOrDefault() ?? GetLanguageFromHeader();
            var statelessAppData = await _initialDataService.GetInitialDataAuthenticated(
                org,
                app,
                user,
                userDetails,
                language
            );
            var statelessAppHtml = GenerateHtmlWithInitialData(org, app, statelessAppData);
            return Content(statelessAppHtml, "text/html; charset=utf-8");
        }

        var instances = await GetInstancesForParty(org, app, userDetails.UserParty.PartyId);

        if (instances.Count > 1 && appMetadata.OnEntry?.Show == "select-instance")
        {
            return Redirect($"/{org}/{app}/instance-selection");
        }

        return Content(instanceCreationHtml, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Shows party selection page with list of parties user can represent.
    /// </summary>
    [HttpGet]
    [Route("{org}/{app}/party-selection")]
    public async Task<IActionResult> PartySelection([FromRoute] string org, [FromRoute] string app)
    {
        var validationResult = await ValidateUserAccessAsync();
        if (!validationResult.Success)
        {
            return validationResult.Error;
        }

        var (user, userDetails) = validationResult.Ok;

        var initialData = await _initialDataService.GetInitialDataAuthenticated(org, app, user, userDetails);
        var appMetadata = initialData.ApplicationMetadata;
        var layoutSets = GetLayoutSetsFromResources();

        var data = new
        {
            applicationMetadata = appMetadata,
            userProfile = userDetails.Profile,
            partiesAllowedToInstantiate = userDetails.PartiesAllowedToInstantiate,
            layoutSets,
        };
        var html = GenerateHtmlWithInitialData(org, app, initialData);
        return Content(html, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Shows party selection page with list of parties user can represent (with error code).
    /// </summary>
    [HttpGet]
    [Route("{org}/{app}/party-selection/{errorCode}")]
    public async Task<IActionResult> PartySelectionWithErrorCode(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] string errorCode // Used by the frontend. Only specified here to separate the route.
    )
    {
        return await PartySelection(org, app);
    }

    /// <summary>
    /// Shows instance selection page with list of user's instances.
    /// </summary>
    [HttpGet]
    [Route("{org}/{app}/instance-selection")]
    public async Task<IActionResult> InstanceSelection([FromRoute] string org, [FromRoute] string app)
    {
        var validationResult = await ValidateUserAccessAsync();
        if (!validationResult.Success)
        {
            return validationResult.Error;
        }

        var (user, userDetails) = validationResult.Ok;
        var initialData = await _initialDataService.GetInitialDataAuthenticated(org, app, user, userDetails);
        var dataJson = JsonSerializer.Serialize(initialData, _jsonSerializerOptions);

        var html = GenerateHtmlWithInitialData(org, app, initialData);
        return Content(html, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Redirects from party-only URL to most recent instance for that party.
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="partyId">The party identifier.</param>
    [HttpGet]
    [Route("{org}/{app}/instance/{partyId}")]
    public IActionResult InstanceByParty([FromRoute] string org, [FromRoute] string app, [FromRoute] int partyId)
    {
        var layoutSets = GetLayoutSetsFromResources();
        string layoutSetsJson = layoutSets is not null
            ? JsonSerializer.Serialize(layoutSets, _jsonSerializerOptions)
            : "null";

        // FIXME: Generate new instance if there is already one? Depends on settings?
        var html = GenerateInstanceCreationHtml(org, app, partyId, layoutSetsJson);
        return Content(html, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Resolves the current task and redirects to the full instance URL with task and page information.
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="partyId">The party identifier.</param>
    /// <param name="instanceGuid">The instance GUID.</param>
    [HttpGet]
    [Route("{org}/{app}/instance/{partyId}/{instanceGuid}")]
    public async Task<IActionResult> InstanceById(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid
    )
    {
        Instance instance = await _instanceClient.GetInstance(app, org, partyId, instanceGuid);

        if (instance.Process?.CurrentTask?.ElementId is null)
        {
            return BadRequest("Instance has no active task");
        }

        string currentTaskId = instance.Process.CurrentTask.ElementId;

        // Get the layout set for the current task to find the first page
        var layoutSet = _appResources.GetLayoutSetForTask(currentTaskId);
        string? firstPageId = null;

        if (layoutSet is not null)
        {
            var layoutSettings = _appResources.GetLayoutSettingsForSet(layoutSet.Id);
            if (layoutSettings?.Pages?.Order is not null && layoutSettings.Pages.Order.Count > 0)
            {
                firstPageId = layoutSettings.Pages.Order[0];
            }
        }

        // Build redirect URL with task and optionally page
        string redirectUrl;
        if (!string.IsNullOrEmpty(firstPageId))
        {
            redirectUrl = $"/{org}/{app}/instance/{partyId}/{instanceGuid}/{currentTaskId}/{firstPageId}";
        }
        else
        {
            return NotFound("no initial page id");
        }

        // Preserve query parameters (e.g., pdf, lang) in the redirect
        if (Request.QueryString.HasValue)
        {
            redirectUrl += Request.QueryString.Value;
        }

        return Redirect(redirectUrl);
    }

    /// <summary>
    /// Renders the receipt page when the process has ended.
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="partyId">The party identifier.</param>
    /// <param name="instanceGuid">The instance GUID.</param>
    [HttpGet]
    [Route("{org}/{app}/instance/{partyId}/{instanceGuid}/ProcessEnd")]
    public async Task<IActionResult> ProcessEnd(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid
    )
    {
        var validationResult = await ValidateUserAccessAsync();
        if (!validationResult.Success)
        {
            return validationResult.Error;
        }

        var (user, userDetails) = validationResult.Ok;

        // Generate and set XSRF token cookie for frontend
        SetXsrfTokenCookie();

        string instanceId = $"{partyId}/{instanceGuid}";
        Instance instance = await _instanceClient.GetInstance(app, org, partyId, instanceGuid);

        // Verify process actually ended (optional safety check)
        if (instance.Process?.Ended.HasValue != true)
        {
            _logger.LogWarning("ProcessEnd route accessed but process not ended for instance {InstanceId}", instanceId);
        }

        var language = Request.Query["lang"].FirstOrDefault() ?? GetLanguageFromHeader();
        var initialData = await _initialDataService.GetInitialDataAuthenticated(
            org,
            app,
            user,
            userDetails,
            instanceId,
            language
        );

        var html = GenerateHtmlWithInitialData(org, app, initialData);
        return Content(html, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Resolves instance with specific task. Redirects to first page if task is current,
    /// otherwise renders app with full data (frontend will show "not available" UI).
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="partyId">The party identifier.</param>
    /// <param name="instanceGuid">The instance GUID.</param>
    /// <param name="taskId">The task identifier.</param>
    [HttpGet]
    [Route("{org}/{app}/instance/{partyId}/{instanceGuid}/{taskId}")]
    public async Task<IActionResult> InstanceByTask(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] string taskId
    )
    {
        // Check auth before proceeding
        var validationResult = await ValidateUserAccessAsync();
        if (!validationResult.Success)
        {
            return validationResult.Error;
        }

        var (user, userDetails) = validationResult.Ok;

        // Generate and set XSRF token cookie for frontend
        SetXsrfTokenCookie();

        Instance instance = await _instanceClient.GetInstance(app, org, partyId, instanceGuid);

        string? currentTaskId = instance.Process?.CurrentTask?.ElementId;

        if (currentTaskId is null)
        {
            return BadRequest("Instance has no active task");
        }

        // If requested task IS the current task → redirect to first page
        if (taskId == currentTaskId)
        {
            var layoutSet = _appResources.GetLayoutSetForTask(currentTaskId);
            string? firstPageId = null;

            if (layoutSet is not null)
            {
                var layoutSettings = _appResources.GetLayoutSettingsForSet(layoutSet.Id);
                if (layoutSettings?.Pages?.Order is not null && layoutSettings.Pages.Order.Count > 0)
                {
                    firstPageId = layoutSettings.Pages.Order[0];
                }
            }

            if (!string.IsNullOrEmpty(firstPageId))
            {
                string redirectUrl = $"/{org}/{app}/instance/{partyId}/{instanceGuid}/{currentTaskId}/{firstPageId}";

                // Preserve query parameters (e.g., lang)
                if (Request.QueryString.HasValue)
                {
                    redirectUrl += Request.QueryString.Value;
                }

                return Redirect(redirectUrl);
            }

            // No first page found - fall through to render HTML with full data
        }

        // If requested task is NOT current OR no first page found → render app with full initial data
        // Frontend will handle navigation appropriately
        string instanceId = $"{partyId}/{instanceGuid}";
        var language = Request.Query["lang"].FirstOrDefault() ?? GetLanguageFromHeader();
        var initialData = await _initialDataService.GetInitialDataAuthenticated(
            org,
            app,
            user,
            userDetails,
            instanceId,
            language
        );

        var html = GenerateHtmlWithInitialData(org, app, initialData);
        return Content(html, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Renders the main application view for a specific instance, task, and page.
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="partyId">The party identifier.</param>
    /// <param name="instanceGuid">The instance GUID.</param>
    /// <param name="taskId">The task identifier.</param>
    /// <param name="pageId">The page identifier.</param>
    [HttpGet]
    [Route("{org}/{app}/instance/{partyId}/{instanceGuid}/{taskId}/{pageId}")]
    public async Task<IActionResult> InstanceView(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] string taskId,
        [FromRoute] string pageId
    )
    {
        var validationResult = await ValidateUserAccessAsync();
        if (!validationResult.Success)
        {
            return validationResult.Error;
        }

        var (user, userDetails) = validationResult.Ok;

        // Generate and set XSRF token cookie for frontend
        SetXsrfTokenCookie();

        // Construct instance ID from route parameters if available
        string instanceId = $"{partyId}/{instanceGuid}";

        var language = Request.Query["lang"].FirstOrDefault() ?? GetLanguageFromHeader();

        var initialData = await _initialDataService.GetInitialDataAuthenticated(
            org,
            app,
            user,
            userDetails,
            instanceId,
            language
        );

        var html = GenerateHtmlWithInitialData(org, app, initialData);
        return Content(html, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Record for query parameter initialization data used in stateless app prefill.
    /// </summary>
    /// <param name="DataModelName">The data model identifier.</param>
    /// <param name="AppId">The application identifier.</param>
    /// <param name="PrefillFields">Dictionary of fields to prefill.</param>
    public record QueryParamInit(
        [property: JsonPropertyName("dataModelName")] string DataModelName,
        [property: JsonPropertyName("appId")] string AppId,
        [property: JsonPropertyName("prefillFields")] Dictionary<string, string> PrefillFields
    );

    /// <summary>
    /// Sets query parameters in frontend session storage for later use in prefill of stateless apps
    /// </summary>
    /// <remarks>
    /// Only parameters specified in [dataTypeId].prefill.json will be accepted.
    /// Returns an HTML document with a small javascript that will set session variables in frontend and redirect to the app.
    /// </remarks>
    [HttpGet]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK, "text/html")]
    [ProducesResponseType(typeof(string), StatusCodes.Status400BadRequest, "text/plain")]
    [Route("{org}/{app}/set-query-params")]
    public async Task<IActionResult> SetQueryParams(string org, string app)
    {
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        if (!IsStatelessApp(application))
        {
            return BadRequest("You can only use query params with a stateless task.");
        }

        var prefillData = new List<QueryParamInit>();

        foreach (var dataType in application.DataTypes)
        {
            var prefillJson = _appResources.GetPrefillJson(dataType.Id);
            if (prefillJson is null)
                continue;
            using var jsonDoc = JsonDocument.Parse(prefillJson);
            if (!jsonDoc.RootElement.TryGetProperty("QueryParameters", out var allowedQueryParams))
                continue;
            if (allowedQueryParams.ValueKind != JsonValueKind.Object)
                throw new Exception($"Invalid {dataType.Id}.prefill.json, \"QueryParameters\" must be an object.");

            var prefillForType = allowedQueryParams
                .EnumerateObject()
                .Where(param => Request.Query.ContainsKey(param.Name))
                .ToDictionary(param => param.Value.ToString(), param => Request.Query[param.Name].ToString());

            if (prefillForType.Count > 0)
            {
                prefillData.Add(new QueryParamInit(dataType.Id, application.Id, prefillForType));
            }
        }

        if (prefillData.Count == 0)
        {
            return BadRequest("Found no valid query params.");
        }

        string nonce = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16));

        var htmlContent = $$"""
            <!DOCTYPE html>
            <html lang='en'>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>Set Query Params</title>
            </head>
            <body>
                <script nonce='{{nonce}}'>
                  const prefillData = {{JsonSerializer.Serialize(prefillData)}}.map(entry => ({
                            ...entry,
                            created: new Date().toISOString()
                        }));
                    sessionStorage.setItem('queryParams', JSON.stringify(prefillData));
                    window.location.href = `${window.location.origin}/{{application.AppIdentifier.Org}}/{{application.AppIdentifier.App}}`;
                </script>
            </body>
            </html>
            """;

        Response.Headers["Content-Security-Policy"] = $"default-src 'self'; script-src 'nonce-{nonce}';";

        return Content(htmlContent, "text/html");
    }

    /// <summary>
    /// Debug endpoint to test the initial data service.
    /// </summary>
    [HttpGet]
    [Route("{org}/{app}/debug-initial-data")]
    public async Task<IActionResult> DebugInitialData(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] string? instanceId = null,
        [FromQuery] string? language = null
    )
    {
        var validationResult = await ValidateUserAccessAsync();
        if (!validationResult.Success)
        {
            return validationResult.Error;
        }

        var (user, userDetails) = validationResult.Ok;
        try
        {
            var initialData = await _initialDataService.GetInitialDataAuthenticated(
                org,
                app,
                user,
                userDetails,
                instanceId,
                language
            );
            return Json(initialData);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message, stackTrace = ex.StackTrace });
        }
    }

    private async Task<List<Instance>> GetInstancesForParty(string org, string app, int partyId)
    {
        Dictionary<string, StringValues> queryParams = new()
        {
            { "appId", $"{org}/{app}" },
            { "instanceOwner.partyId", partyId.ToString(CultureInfo.InvariantCulture) },
            { "status.isArchived", "false" },
            { "status.isSoftDeleted", "false" },
        };

        return await _instanceClient.GetInstances(queryParams);
    }

    private async Task<bool> AllowAnonymous()
    {
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        if (!IsStatelessApp(application))
        {
            return false;
        }
        DataType? dataType = GetStatelessDataType(application);

        if (dataType is not null && dataType.AppLogic.AllowAnonymousOnStateless)
        {
            return true;
        }

        return false;
    }

    private bool UserCanSeeStatelessApp(ApplicationMetadata appMetadata)
    {
        if (!IsStatelessApp(appMetadata))
        {
            return false;
        }

        DataType? dataType = GetStatelessDataType(appMetadata);

        if (dataType is not null && dataType.AppLogic.AllowAnonymousOnStateless)
        {
            return true;
        }

        return false;
    }

    private bool IsStatelessApp(ApplicationMetadata application)
    {
        if (application?.OnEntry is null)
        {
            return false;
        }

        return !_onEntryWithInstance.Contains(application.OnEntry.Show);
    }

    private DataType? GetStatelessDataType(ApplicationMetadata application)
    {
        var layoutSets = GetLayoutSetsFromResources();

        // Stateless apps only work with layout sets
        if (layoutSets is not null)
        {
            string? dataTypeId = layoutSets.Sets?.Find(set => set.Id == application.OnEntry?.Show)?.DataType;
            return application.DataTypes.Find(d => d.Id == dataTypeId);
        }

        return null;
    }

    private string GetLanguageFromHeader()
    {
        var acceptLanguageHeader = Request.Headers["Accept-Language"].ToString();
        if (!string.IsNullOrEmpty(acceptLanguageHeader))
        {
            var languages = acceptLanguageHeader.Split(',');
            foreach (var lang in languages)
            {
                var cleanLang = lang.Split(';')[0].Trim();
                if (cleanLang.Length >= 2)
                {
                    cleanLang = cleanLang[..2].ToLower(CultureInfo.InvariantCulture);
                    if (_generalSettings.LanguageCodes?.Contains(cleanLang) == true)
                    {
                        return cleanLang;
                    }
                }
            }
        }
        return "nb"; // Default to Norwegian Bokmål
    }

    private string GenerateHtmlWithInitialData<T>(string org, string app, T initialData)
        where T : InitialDataResponse
    {
        // Serialize initial data to JSON
        var initialDataJson = JsonSerializer.Serialize(initialData, _jsonSerializerOptions);

        return GenerateHtmlWithJsonString(org, app, initialDataJson);
    }

    private string? GetCustomCss()
    {
        try
        {
            var customCssPath = Path.Combine(_env.ContentRootPath, "wwwroot", "css", "custom.css");
            if (System.IO.File.Exists(customCssPath))
            {
                return System.IO.File.ReadAllText(customCssPath);
            }
        }
        catch
        {
            // Log error but don't fail
        }
        return null;
    }

    private string? GetCustomJs()
    {
        try
        {
            var customJsPath = Path.Combine(_env.ContentRootPath, "wwwroot", "js", "custom.js");
            if (System.IO.File.Exists(customJsPath))
            {
                return System.IO.File.ReadAllText(customJsPath);
            }
        }
        catch
        {
            // Log error but don't fail
        }
        return null;
    }

    /// <summary>
    /// Parses layout sets from app resources.
    /// </summary>
    /// <returns>Parsed LayoutSets object, or null if not available or parsing fails.</returns>
    private LayoutSets? GetLayoutSetsFromResources()
    {
        string layoutSetsString = _appResources.GetLayoutSets();
        if (string.IsNullOrEmpty(layoutSetsString))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<LayoutSets>(layoutSetsString, _jsonSerializerOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize layout sets");
            return null;
        }
    }

    private static string GetEmbeddedJavaScript(string resourceName)
    {
        var assembly = Assembly.GetExecutingAssembly();
        var fullResourceName = $"Altinn.App.Api.Scripts.{resourceName}";

        using var stream =
            assembly.GetManifestResourceStream(fullResourceName)
            ?? throw new InvalidOperationException($"Could not find embedded resource: {fullResourceName}");

        using var reader = new StreamReader(stream);
        return reader.ReadToEnd();
    }

    private static string GetInstanceCreationScript(string org, string app, int partyId)
    {
        var template = GetEmbeddedJavaScript("instance-creation.js");
        return template
            .Replace("{{ORG}}", org)
            .Replace("{{APP}}", app)
            .Replace("{{PARTY_ID}}", partyId.ToString(CultureInfo.InvariantCulture));
    }

    private string GenerateInstanceCreationHtml(string org, string app, int partyId, string layoutSetsJson)
    {
        _logger.LogInformation(
            "Generating instance creation page for {Org}/{App} with partyId {PartyId}",
            org,
            app,
            partyId
        );

        string nonce = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16));
        var jsContent = GetInstanceCreationScript(org, app, partyId);

        var htmlContent = $$"""
            <!DOCTYPE html>
            <html lang='no'>
            <head>
                <meta charset='UTF-8'>
                <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                <title>Creating instance - {{org}}/{{app}}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; }
                    .container { display: flex; justify-content: center; align-items: center; height: 100vh; }
                    .content { text-align: center; max-width: 600px; padding: 20px; }
                    .error { color: #d32f2f; }
                </style>
            </head>
            <body>
                <div id='root'>
                    <div class='container'>
                        <div class='content'>
                            <h1>Creating instance...</h1>
                            <p>Please wait while we set up your form.</p>
                        </div>
                    </div>
                </div>
                <script nonce='{{nonce}}'>
                    window.AltinnLayoutSets = {{layoutSetsJson}};

                    {{jsContent}}
                </script>
            </body>
            </html>
            """;

        Response.Headers.ContentSecurityPolicy = $"default-src 'self'; script-src 'nonce-{nonce}';";

        return htmlContent;
    }

    private string GenerateHtmlWithJsonString(string org, string app, string dataJson)
    {
        // Check if frontendVersion cookie is set and use it as base URL
        var frontendUrl = (_generalSettings.FrontendBaseUrl ?? APP_FRONTEND_CDN_URL).TrimEnd('/');
        var useCustomFrontendVersion = false;
        if (
            HttpContext.Request.Cookies.TryGetValue("frontendVersion", out var frontendVersionCookie)
            && !string.IsNullOrEmpty(frontendVersionCookie)
        )
        {
            frontendUrl = frontendVersionCookie.TrimEnd('/');
            useCustomFrontendVersion = true;
        }

        // Don't append version if using custom frontend URL
        var appVersion = useCustomFrontendVersion ? "" : "4";
        var versionPath = string.IsNullOrEmpty(appVersion) ? "" : $"{appVersion}/";

        var customCss = GetCustomCss();
        var customJs = GetCustomJs();

        // Build optional sections
        var customCssTag = !string.IsNullOrEmpty(customCss) ? $"\n  <style>{customCss}</style>" : "";
        var customJsTag = !string.IsNullOrEmpty(customJs) ? $"\n  <script>{customJs}</script>" : "";

        var htmlContent = $$"""
            <!DOCTYPE html>
            <html lang="no">
            <head>
              <meta charset="utf-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
              <title>{{org}} - {{app}}</title>
              <link rel="icon" href="{{ALTINN_CDN_URL}}/favicon.ico">
              <link rel="stylesheet" type="text/css" href="{{frontendUrl}}/{{versionPath}}altinn-app-frontend.css">{{customCssTag}}
            </head>
            <body>
              <div id="root"></div>
              <script>
                window.AltinnAppData = {{dataJson}};
                window.org = '{{org}}';
                window.app = '{{app}}';
              </script>
              <script src="{{frontendUrl}}/{{versionPath}}altinn-app-frontend.js"></script>{{customJsTag}}
            </body>
            </html>
            """;

        return htmlContent;
    }

    private async Task<Authenticated.User.Details> GetUserDetails(Authenticated.User user)
    {
        var details = await user.LoadDetails(validateSelectedParty: false);

        // Merge with mock data if available
        var mockData = _initialDataService.GetMockData();
        return MergeUserDetails(details, mockData);
    }

    private Authenticated.User.Details MergeUserDetails(
        Authenticated.User.Details real,
        Dictionary<string, object>? mockData
    )
    {
        // Check if there's userDetails mock data
        if (mockData is null || !mockData.TryGetValue("userDetails", out var userDetailsMock))
        {
            return real;
        }
        try
        {
            var userDetailsJson = JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(userDetailsMock));
            var result = real;

            // Apply simple property overrides using 'with' syntax
            if (userDetailsJson.TryGetProperty("representsSelf", out var rs))
            {
                result = result with { RepresentsSelf = rs.GetBoolean() };
            }

            if (userDetailsJson.TryGetProperty("canRepresent", out var cr))
            {
                result = result with { CanRepresent = cr.GetBoolean() };
            }

            // Handle complex collections first (so we have the merged parties list)
            var parties = real.Parties.ToList();
            if (mockData.TryGetValue("parties", out var partiesMock))
            {
                parties = ParseMockParties(partiesMock, parties);
                result = result with { Parties = parties };
            }

            // Handle partiesAllowedToInstantiate from userDetails
            if (userDetailsJson.TryGetProperty("partiesAllowedToInstantiate", out var paiMock))
            {
                _logger?.LogDebug(
                    "Found partiesAllowedToInstantiate in mock data. ValueKind: {ValueKind}, RawText: {RawText}",
                    paiMock.ValueKind,
                    paiMock.GetRawText()
                );
                var partiesAllowed = ParseMockParties(paiMock, new List<Altinn.Platform.Register.Models.Party>());
                _logger?.LogDebug("Parsed {Count} parties for partiesAllowedToInstantiate", partiesAllowed.Count);
                result = result with { PartiesAllowedToInstantiate = partiesAllowed };
            }

            // Handle userProfile mock data merge
            if (mockData.TryGetValue("userProfile", out var userProfileMock))
            {
                var mockDataHelper = new MockDataHelper();
                var mergedProfile = mockDataHelper.MergeUserProfile(result.Profile, userProfileMock);
                result = result with { Profile = mergedProfile };
            }

            // Handle party ID overrides using the merged parties list
            if (userDetailsJson.TryGetProperty("selectedPartyId", out var spId))
            {
                var selectedParty = parties.FirstOrDefault(p => p.PartyId == spId.GetInt32()) ?? real.SelectedParty;
                result = result with { SelectedParty = selectedParty };
            }

            if (userDetailsJson.TryGetProperty("userPartyId", out var upId))
            {
                var userParty = parties.FirstOrDefault(p => p.PartyId == upId.GetInt32()) ?? real.UserParty;
                result = result with { UserParty = userParty };
            }

            return result;
        }
        catch (Exception)
        {
            // If parsing fails, return real details to avoid breaking functionality
            return real;
        }
    }

    private static List<Platform.Register.Models.Party> ParseMockParties(
        object partiesMock,
        List<Platform.Register.Models.Party> baseParties
    )
    {
        try
        {
            var mockPartiesJson = JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(partiesMock));
            if (mockPartiesJson.ValueKind != JsonValueKind.Array)
                return baseParties;

            var result = baseParties.ToList();
            foreach (var mockPartyElement in mockPartiesJson.EnumerateArray())
            {
                if (!mockPartyElement.TryGetProperty("partyId", out var mockPartyIdProp))
                    continue;

                var mockPartyId = mockPartyIdProp.GetInt32();
                var existingIndex = result.FindIndex(p => p.PartyId == mockPartyId);

                var mockParty = new Platform.Register.Models.Party
                {
                    PartyId = mockPartyId,
                    Name = mockPartyElement.TryGetProperty("name", out var nameProp)
                        ? nameProp.GetString() ?? $"Party {mockPartyId}"
                        : $"Party {mockPartyId}",
                    PartyTypeName = mockPartyElement.TryGetProperty("partyTypeName", out var typeProp)
                        ? (Platform.Register.Enums.PartyType)typeProp.GetInt32()
                        : Platform.Register.Enums.PartyType.Person,
                };

                if (existingIndex >= 0)
                    result[existingIndex] = mockParty;
                else
                    result.Add(mockParty);
            }
            return result;
        }
        catch (Exception)
        {
            return baseParties;
        }
    }

    /// <summary>
    /// Sets the XSRF token cookie for frontend JavaScript consumption.
    /// </summary>
    private void SetXsrfTokenCookie()
    {
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
        if (tokens.RequestToken is not null)
        {
            HttpContext.Response.Cookies.Append(
                "XSRF-TOKEN",
                tokens.RequestToken,
                new CookieOptions
                {
                    HttpOnly = false, // Make this cookie readable by Javascript.
                }
            );
        }
    }

    /// <summary>
    /// Represents a successful user authentication result containing user and user details.
    /// </summary>
    /// <param name="User">The authenticated user</param>
    /// <param name="UserDetails">The user details</param>
    public record AuthenticatedUserData(Authenticated.User User, Authenticated.User.Details UserDetails);

    /// <summary>
    /// Validates user authentication and authorization for actions that require authenticated user access.
    /// </summary>
    /// <returns>ServiceResult containing authenticated user data on success, or IActionResult on failure.</returns>
    private async Task<ServiceResult<AuthenticatedUserData, IActionResult>> ValidateUserAccessAsync()
    {
        var auth = _authenticationContext.Current;
        if (auth is not Authenticated.User user)
        {
            return Forbid();
        }

        var userDetails = await GetUserDetails(user);
        return new AuthenticatedUserData(user, userDetails);
    }

    private RedirectResult RedirectToErrorPage(string org, string app, HttpStatusCode statusCode)
    {
        return Redirect($"/{org}/{app}/error?statusCode={statusCode}");
    }
}

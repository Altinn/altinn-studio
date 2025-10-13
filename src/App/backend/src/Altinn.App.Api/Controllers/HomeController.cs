using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Provides access to the default home view.
/// </summary>
public class HomeController : Controller
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly IAntiforgery _antiforgery;
    private readonly PlatformSettings _platformSettings;
    private readonly IWebHostEnvironment _env;
    private readonly AppSettings _appSettings;
    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly IInitialDataService _initialDataService;
    private readonly GeneralSettings _generalSettings;
    private readonly List<string> _onEntryWithInstance = new List<string> { "new-instance", "select-instance" };
    private readonly IAuthenticationContext _authenticationContext;
    private readonly IInstanceClient _instanceClient;

    /// <summary>
    /// Initialize a new instance of the <see cref="HomeController"/> class.
    /// </summary>
    /// <param name="antiforgery">The anti forgery service.</param>
    /// <param name="platformSettings">The platform settings.</param>
    /// <param name="env">The current environment.</param>
    /// <param name="appSettings">The application settings</param>
    /// <param name="appResources">The application resources service</param>
    /// <param name="appMetadata">The application metadata service</param>
    /// <param name="initialDataService">The initial data service</param>
    /// <param name="generalSettings">The general settings</param>
    /// <param name="authenticationContext">The authentication context service</param>
    /// <param name="instanceClient">The instance client service</param>
    public HomeController(
        IAntiforgery antiforgery,
        IOptions<PlatformSettings> platformSettings,
        IWebHostEnvironment env,
        IOptions<AppSettings> appSettings,
        IAppResources appResources,
        IAppMetadata appMetadata,
        IInitialDataService initialDataService,
        IOptions<GeneralSettings> generalSettings,
        IAuthenticationContext authenticationContext,
        IInstanceClient instanceClient
    )
    {
        _antiforgery = antiforgery;
        _platformSettings = platformSettings.Value;
        _env = env;
        _appSettings = appSettings.Value;
        _appResources = appResources;
        _appMetadata = appMetadata;
        _initialDataService = initialDataService;
        _generalSettings = generalSettings.Value;
        _authenticationContext = authenticationContext;
        _instanceClient = instanceClient;
    }

    /// <summary>
    /// Main entry point for the application. Handles authentication, party selection, and routing to appropriate views.
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="skipPartySelection">If true, skips party selection prompt even when PromptForParty is 'always'.</param>
    [HttpGet]
    [Route("{org}/{app}/")]
    public async Task<IActionResult> Index(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] bool skipPartySelection = false
    )
    {
        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();

        if (IsStatelessApp(application) && await AllowAnonymous())
        {
            var statelessAppData = await _initialDataService.GetInitialData(org, app);
            var statelessApphtml = GenerateHtml(org, app, statelessAppData);
            return Content(statelessApphtml);
        }

        var currentAuth = _authenticationContext.Current;
        Authenticated.User? auth = currentAuth as Authenticated.User;
        if (auth == null)
        {
            throw new UnauthorizedAccessException("You need to be logged in to see this app.");
        }

        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
        if (tokens.RequestToken != null)
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

        var details = await auth.LoadDetails(validateSelectedParty: false);

        if (!details.CanRepresentParty(details.Profile.PartyId))
        {
            if (details.PartiesAllowedToInstantiate.Count == 0)
            {
                throw new UnauthorizedAccessException("You have no parties that can use this app");
            }
            return Redirect(Request.GetDisplayUrl() + "party-selection/");
        }

        if (details.PartiesAllowedToInstantiate.Count > 1 && !skipPartySelection)
        {
            if (application.PromptForParty == "always")
            {
                return Redirect(Request.GetDisplayUrl() + "party-selection/");
            }

            if (application.PromptForParty != "never" && !details.Profile.ProfileSettingPreference.DoNotPromptForParty)
            {
                return Redirect(Request.GetDisplayUrl() + "party-selection/");
            }
        }

        if (IsStatelessApp(application))
        {
            var language = Request.Query["lang"].FirstOrDefault() ?? GetLanguageFromHeader();
            var statelessAppData = await _initialDataService.GetInitialData(
                org,
                app,
                null,
                details.UserParty.PartyId,
                language
            );
            var statelessAppHtml = GenerateHtml(org, app, statelessAppData);
            return Content(statelessAppHtml, "text/html; charset=utf-8");
        }

        var instances = await GetInstancesForParty(org, app, details.UserParty.PartyId);

        Instance? mostRecentInstance = instances.OrderByDescending(i => i.LastChanged).FirstOrDefault();

        if (mostRecentInstance == null)
        {
            // Get layoutSets for instance creation
            string layoutSetsString = _appResources.GetLayoutSets();
            string layoutSetsJson = string.IsNullOrEmpty(layoutSetsString) ? "null" : layoutSetsString;

            var html = GenerateInstanceCreationHtml(org, app, details.UserParty.PartyId, layoutSetsJson);
            return Content(html, "text/html; charset=utf-8");
        }

        if (instances.Count > 1 && application.OnEntry?.Show == "select-instance")
        {
            return Redirect(Request.GetDisplayUrl() + "instance-selection");
        }

        var currentTask = mostRecentInstance.Process.CurrentTask;
        var layoutSet = _appResources.GetLayoutSetForTask(currentTask.ElementId);
        string? firstPageId = null;

        if (layoutSet != null)
        {
            var layoutSettings = _appResources.GetLayoutSettingsForSet(layoutSet.Id);
            if (layoutSettings?.Pages?.Order != null && layoutSettings.Pages.Order.Count > 0)
            {
                firstPageId = layoutSettings.Pages.Order[0];
            }
        }

        string redirectUrl = $"{Request.GetDisplayUrl()}instance/{mostRecentInstance.Id}/{currentTask.ElementId}/{firstPageId}";
        return Redirect(redirectUrl);
    }

    /// <summary>
    /// Shows party selection page with list of parties user can represent.
    /// </summary>
    [HttpGet]
    [Route("{org}/{app}/party-selection")]
    public async Task<IActionResult> PartySelection([FromRoute] string org, [FromRoute] string app)
    {
        var currentAuth = _authenticationContext.Current;
        Authenticated.User? auth = currentAuth as Authenticated.User;

        if (auth == null)
        {
            throw new UnauthorizedAccessException("You need to be logged in to see this page.");
        }

        var details = await auth.LoadDetails(validateSelectedParty: false);
        var application = await _appMetadata.GetApplicationMetadata();

        string layoutSetsString = _appResources.GetLayoutSets();
        LayoutSets? layoutSets = null;
        if (!string.IsNullOrEmpty(layoutSetsString))
        {
            layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsString, _jsonSerializerOptions);
        }

        var data = new
        {
            applicationMetadata = application,
            userProfile = details.Profile,
            partiesAllowedToInstantiate = details.PartiesAllowedToInstantiate,
            layoutSets,
        };
        var dataJson = JsonSerializer.Serialize(data, _jsonSerializerOptions);
        var html = GenerateHtmlWithInstances(org, app, dataJson);
        return Content(html, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Shows instance selection page with list of user's instances.
    /// </summary>
    [HttpGet]
    [Route("{org}/{app}/instance-selection")]
    public async Task<IActionResult> InstanceSelection([FromRoute] string org, [FromRoute] string app)
    {
        var currentAuth = _authenticationContext.Current;
        Authenticated.User? auth = currentAuth as Authenticated.User;

        if (auth == null)
        {
            throw new UnauthorizedAccessException("You need to be logged in to see this page.");
        }

        var details = await auth.LoadDetails(validateSelectedParty: false);
        var application = await _appMetadata.GetApplicationMetadata();

        string layoutSetsString = _appResources.GetLayoutSets();
        LayoutSets? layoutSets = null;
        if (!string.IsNullOrEmpty(layoutSetsString))
        {
            layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsString, _jsonSerializerOptions);
        }

        var data = new
        {
            applicationMetadata = application,
            userProfile = details.Profile,
            layoutSets,
        };
        var dataJson = JsonSerializer.Serialize(data, _jsonSerializerOptions);
        var html = GenerateHtmlWithInstances(org, app, dataJson);
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
    public async Task<IActionResult> InstanceByParty(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId
    )
    {
        var instances = await GetInstancesForParty(org, app, partyId);
        Instance? mostRecentInstance = instances.OrderByDescending(i => i.LastChanged).FirstOrDefault();

        if (mostRecentInstance == null)
        {
            // No instances found - create new instance
            string layoutSetsString = _appResources.GetLayoutSets();
            string layoutSetsJson = string.IsNullOrEmpty(layoutSetsString) ? "null" : layoutSetsString;

            var html = GenerateInstanceCreationHtml(org, app, partyId, layoutSetsJson);
            return Content(html, "text/html; charset=utf-8");
        }

        var currentTask = mostRecentInstance.Process.CurrentTask;
        if (currentTask?.ElementId == null)
        {
            return BadRequest("Instance has no active task");
        }

        var layoutSet = _appResources.GetLayoutSetForTask(currentTask.ElementId);
        string? firstPageId = null;

        if (layoutSet != null)
        {
            var layoutSettings = _appResources.GetLayoutSettingsForSet(layoutSet.Id);
            if (layoutSettings?.Pages?.Order != null && layoutSettings.Pages.Order.Count > 0)
            {
                firstPageId = layoutSettings.Pages.Order[0];
            }
        }

        if (string.IsNullOrEmpty(firstPageId))
        {
            return NotFound("No initial page id found");
        }

        var instanceGuid = mostRecentInstance.Id.Split('/').Last();
        string redirectUrl = $"/{org}/{app}/instance/{partyId}/{instanceGuid}/{currentTask.ElementId}/{firstPageId}";
        return Redirect(redirectUrl);
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

        if (instance.Process?.CurrentTask?.ElementId == null)
        {
            return BadRequest("Instance has no active task");
        }

        string currentTaskId = instance.Process.CurrentTask.ElementId;

        // Get the layout set for the current task to find the first page
        var layoutSet = _appResources.GetLayoutSetForTask(currentTaskId);
        string? firstPageId = null;

        if (layoutSet != null)
        {
            var layoutSettings = _appResources.GetLayoutSettingsForSet(layoutSet.Id);
            if (layoutSettings?.Pages?.Order != null && layoutSettings.Pages.Order.Count > 0)
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

        return Redirect(redirectUrl);
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
        if (await UserCanSeeStatelessApp())
        {
            // Generate and set XSRF token cookie for frontend
            var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
            if (tokens.RequestToken != null)
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

            // Construct instance ID from route parameters if available
            string instanceId = $"{partyId}/{instanceGuid}";

            var language = Request.Query["lang"].FirstOrDefault() ?? GetLanguageFromHeader();
            var initialData = await _initialDataService.GetInitialData(org, app, instanceId, partyId, language);
            var html = GenerateHtml(org, app, initialData);
            return Content(html, "text/html; charset=utf-8");
        }
        return BadRequest();
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
        [FromQuery] int? partyId = null,
        [FromQuery] string? language = null
    )
    {
        try
        {
            var initialData = await _initialDataService.GetInitialData(org, app, instanceId, partyId, language);
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

        if (dataType != null && dataType.AppLogic.AllowAnonymousOnStateless)
        {
            return true;
        }

        return false;
    }

    private async Task<bool> UserCanSeeStatelessApp()
    {
        if (User?.Identity?.IsAuthenticated == true)
        {
            return true;
        }

        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();
        if (!IsStatelessApp(application))
        {
            return false;
        }

        DataType? dataType = GetStatelessDataType(application);

        if (dataType != null && dataType.AppLogic.AllowAnonymousOnStateless)
        {
            return true;
        }

        return false;
    }

    private bool IsStatelessApp(ApplicationMetadata application)
    {
        if (application?.OnEntry == null)
        {
            return false;
        }

        return !_onEntryWithInstance.Contains(application.OnEntry.Show);
    }

    private DataType? GetStatelessDataType(ApplicationMetadata application)
    {
        string layoutSetsString = _appResources.GetLayoutSets();

        // Stateless apps only work with layousets
        if (!string.IsNullOrEmpty(layoutSetsString))
        {
            LayoutSets? layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsString, _jsonSerializerOptions);
            string? dataTypeId = layoutSets?.Sets?.Find(set => set.Id == application.OnEntry?.Show)?.DataType;
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
                    cleanLang = cleanLang.Substring(0, 2).ToLower();
                    if (_generalSettings.LanguageCodes?.Contains(cleanLang) == true)
                    {
                        return cleanLang;
                    }
                }
            }
        }
        return "nb"; // Default to Norwegian Bokmål
    }

    private string GenerateHtml(
        string org,
        string app,
        Altinn.App.Core.Features.Bootstrap.Models.InitialDataResponse initialData
    )
    {
        var cdnUrl =
            _generalSettings.FrontendBaseUrl?.TrimEnd('/') ?? "https://altinncdn.no/toolkits/altinn-app-frontend";

        var appVersion = "4"; // Default version, can be made configurable later

        // Serialize initial data to JSON
        var initialDataJson = JsonSerializer.Serialize(initialData, _jsonSerializerOptions);

        var customCss = GetCustomCss(org, app);
        var customJs = GetCustomJs(org, app);

        var html = new StringBuilder();
        html.AppendLine("<!DOCTYPE html>");
        html.AppendLine("<html lang=\"no\">");
        html.AppendLine("<head>");
        html.AppendLine("  <meta charset=\"utf-8\">");
        html.AppendLine("  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">");
        html.AppendLine("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, shrink-to-fit=no\">");
        html.AppendLine($"  <title>{org} - {app}</title>");
        html.AppendLine("  <link rel=\"icon\" href=\"https://altinncdn.no/favicon.ico\">");
        html.AppendLine(
            $"  <link rel=\"stylesheet\" type=\"text/css\" href=\"{cdnUrl}/{appVersion}/altinn-app-frontend.css\">"
        );

        if (!string.IsNullOrEmpty(customCss))
        {
            html.AppendLine($"  <style>{customCss}</style>");
        }

        html.AppendLine("</head>");
        html.AppendLine("<body>");
        html.AppendLine("  <div id=\"root\"></div>");
        html.AppendLine("  <script>");
        html.AppendLine($"    window.AltinnAppData = {initialDataJson};");
        html.AppendLine($"    window.org = '{org}';");
        html.AppendLine($"    window.app = '{app}';");
        html.AppendLine("  </script>");
        html.AppendLine($"  <script src=\"{cdnUrl}/{appVersion}/altinn-app-frontend.js\"></script>");

        if (!string.IsNullOrEmpty(customJs))
        {
            html.AppendLine($"  <script>{customJs}</script>");
        }

        html.AppendLine("</body>");
        html.AppendLine("</html>");

        return html.ToString();
    }

    private string? GetCustomCss(string org, string app)
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

    private string? GetCustomJs(string org, string app)
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

    private string GenerateInstanceCreationHtml(string org, string app, int partyId, string layoutSetsJson)
    {
        string nonce = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(16));

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
                    window.org = '{{org}}';
                    window.app = '{{app}}';

                    (async function() {
                      try {
                        const xsrfToken = document.cookie
                          .split('; ')
                          .find(row => row.startsWith('XSRF-TOKEN='))
                          ?.split('=')[1];

                        if (!xsrfToken) {
                          throw new Error('XSRF token not found');
                        }

                        const response = await fetch('/{{org}}/{{app}}/instances?instanceOwnerPartyId={{partyId}}', {
                          method: 'POST',
                          headers: {
                            'X-XSRF-TOKEN': xsrfToken,
                            'Content-Type': 'application/json'
                          }
                        });

                        if (!response.ok) {
                          const errorText = await response.text();
                          throw new Error(`Failed to create instance: ${response.status} - ${errorText}`);
                        }

                        const instance = await response.json();
                        const [partyId, instanceGuid] = instance.id.split('/');
                        const taskId = instance.process.currentTask.elementId;

                        let firstPageId = null;
                        if (window.AltinnLayoutSets && window.AltinnLayoutSets.sets) {
                          const layoutSet = window.AltinnLayoutSets.sets.find(set =>
                            set.tasks && set.tasks.includes(taskId)
                          );
                          if (layoutSet && layoutSet.id) {
                            const settingsResponse = await fetch('/{{org}}/{{app}}/api/layoutsettings/' + layoutSet.id);
                            if (settingsResponse.ok) {
                              const settings = await settingsResponse.json();
                              if (settings.pages && settings.pages.order && settings.pages.order.length > 0) {
                                firstPageId = settings.pages.order[0];
                              }
                            }
                          }
                        }

                        const redirectUrl = '/{{org}}/{{app}}/instance/' + partyId + '/' + instanceGuid + '/' + taskId + '/' + (firstPageId || '');
                        window.location.href = redirectUrl;
                      } catch (error) {
                        console.error('Error creating instance:', error);
                        document.getElementById('root').innerHTML = `
                          <div class="container">
                            <div class="content">
                              <h1>Failed to create instance</h1>
                              <p class="error">${error.message}</p>
                              <p>Please try again or contact support if the problem persists.</p>
                            </div>
                          </div>
                        `;
                      }
                    })();
                </script>
            </body>
            </html>
            """;

        Response.Headers["Content-Security-Policy"] = $"default-src 'self'; script-src 'nonce-{nonce}';";

        return htmlContent;
    }

    private string GenerateHtmlWithInstances(string org, string app, string dataJson)
    {
        var cdnUrl =
            _generalSettings.FrontendBaseUrl?.TrimEnd('/') ?? "https://altinncdn.no/toolkits/altinn-app-frontend";

        var appVersion = "4";

        var customCss = GetCustomCss(org, app);
        var customJs = GetCustomJs(org, app);

        var html = new StringBuilder();
        html.AppendLine("<!DOCTYPE html>");
        html.AppendLine("<html lang=\"no\">");
        html.AppendLine("<head>");
        html.AppendLine("  <meta charset=\"utf-8\">");
        html.AppendLine("  <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">");
        html.AppendLine("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, shrink-to-fit=no\">");
        html.AppendLine($"  <title>{org} - {app}</title>");
        html.AppendLine("  <link rel=\"icon\" href=\"https://altinncdn.no/favicon.ico\">");
        html.AppendLine(
            $"  <link rel=\"stylesheet\" type=\"text/css\" href=\"{cdnUrl}/{appVersion}/altinn-app-frontend.css\">"
        );

        if (!string.IsNullOrEmpty(customCss))
        {
            html.AppendLine($"  <style>{customCss}</style>");
        }

        html.AppendLine("</head>");
        html.AppendLine("<body>");
        html.AppendLine("  <div id=\"root\"></div>");
        html.AppendLine("  <script>");
        html.AppendLine($"    window.AltinnAppData = {dataJson};");
        html.AppendLine($"    window.org = '{org}';");
        html.AppendLine($"    window.app = '{app}';");
        html.AppendLine("  </script>");

        html.AppendLine($"  <script src=\"{cdnUrl}/{appVersion}/altinn-app-frontend.js\"></script>");

        if (!string.IsNullOrEmpty(customJs))
        {
            html.AppendLine($"  <script>{customJs}</script>");
        }

        html.AppendLine("</body>");
        html.AppendLine("</html>");

        return html.ToString();
    }
}

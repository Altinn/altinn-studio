using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Web;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.ApplicationInsights.AspNetCore.Extensions;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
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
    /// Returns the index view with references to the React app.
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="partyId">The party identifier.</param>
    /// <param name="instanceGuid">The instance GUID.</param>
    /// <param name="taskId">The task identifier.</param>
    /// <param name="pageId">The page identifier.</param>
    /// <param name="dontChooseReportee">Parameter to indicate disabling of reportee selection in Altinn Portal.</param>
    [HttpGet]
    [Route("{org}/{app}/")]
    public async Task<IActionResult> Index([FromRoute] string org, [FromRoute] string app)
    {
        var currentAuth = _authenticationContext.Current;

        if (currentAuth is not Authenticated.User auth)
        {
            throw new UnauthorizedAccessException("This is frontend endpoint only");
        }
        var details = await auth.LoadDetails(validateSelectedParty: false);

        http: //local.altinn.cloud/ttd/component-libraryinstance/512345

        var redirectUrl = Request.GetDisplayUrl() + "/instance/" + details.Profile.Party.PartyId;

        Console.WriteLine("redirectUrl");

        Console.WriteLine(redirectUrl);

        Console.WriteLine("redirectUrl");

        return Redirect(redirectUrl);
    }

    /// <summary>
    /// Returns the index view with references to the React app.
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="partyId">The party identifier.</param>
    /// <param name="instanceGuid">The instance GUID.</param>
    /// <param name="taskId">The task identifier.</param>
    /// <param name="pageId">The page identifier.</param>
    /// <param name="dontChooseReportee">Parameter to indicate disabling of reportee selection in Altinn Portal.</param>
    [HttpGet]
    [Route("{org}/{app}/instance/{partyId}")]
    public async Task<IActionResult> Index([FromRoute] string org, [FromRoute] string app, [FromRoute] int partyId)
    {
        var currentAuth = _authenticationContext.Current;

        if (currentAuth is not Authenticated.User auth)
        {
            throw new UnauthorizedAccessException("This is frontend endpoint only");
        }
        var details = await auth.LoadDetails(validateSelectedParty: false);

        Dictionary<string, StringValues> queryParams = new()
        {
            { "appId", $"{org}/{app}" },
            { "instanceOwner.partyId", details.UserParty.PartyId.ToString(CultureInfo.InvariantCulture) },
            { "status.isArchived", "false" },
            { "status.isSoftDeleted", "false" },
        };

        List<Instance> activeInstances = await _instanceClient.GetInstances(queryParams);

        Instance? mostRecentInstance = activeInstances.OrderByDescending(i => i.LastChanged).FirstOrDefault();

        if (mostRecentInstance != null)
        {
            var extractedInstanceGuid = mostRecentInstance.Id.Split('/').Last();

            var url = Request.GetDisplayUrl() + "/" + extractedInstanceGuid;
            return Redirect(url);
        }
        var language = Request.Query["lang"].FirstOrDefault() ?? GetLanguageFromHeader();

        var initialData = await _initialDataService.GetInitialData(org, app, null, partyId, language);

        // Generate HTML with embedded data
        var html = GenerateHtml(org, app, initialData);
        return Content(html, "text/html; charset=utf-8");
    }

    /// <summary>
    /// Returns the index view with references to the React app.
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="partyId">The party identifier.</param>
    /// <param name="instanceGuid">The instance GUID.</param>
    /// <param name="taskId">The task identifier.</param>
    /// <param name="pageId">The page identifier.</param>
    /// <param name="dontChooseReportee">Parameter to indicate disabling of reportee selection in Altinn Portal.</param>
    [HttpGet]
    [Route("{org}/{app}/instance/{partyId}/{instanceGuid}")]
    // [Authorize(Policy = AuthzConstants.POLICY_INSTANCE_READ)]
    public async Task<IActionResult> Index(
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
            // Fallback to task-only URL if no page is found
            // redirectUrl = $"/{org}/{app}/instance/{partyId}/{instanceGuid}/{currentTaskId}";
            return NotFound("no initial page id");
        }

        return Redirect(redirectUrl);
    }

    /// <summary>
    /// Returns the index view with references to the React app.
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="partyId">The party identifier.</param>
    /// <param name="instanceGuid">The instance GUID.</param>
    /// <param name="taskId">The task identifier.</param>
    /// <param name="pageId">The page identifier.</param>
    /// <param name="dontChooseReportee">Parameter to indicate disabling of reportee selection in Altinn Portal.</param>
    [HttpGet]
    [Route("{org}/{app}/instance/{partyId}/{instanceGuid}/{taskId}/{pageId}")]
    public async Task<IActionResult> Index(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromRoute] int partyId,
        [FromRoute] Guid instanceGuid,
        [FromRoute] string taskId,
        [FromRoute] string pageId,
        [FromQuery] bool dontChooseReportee = false
    )
    {
        if (await ShouldShowAppView())
        {
            // Construct instance ID from route parameters if available
            string instanceId = $"{partyId}/{instanceGuid}";

            // Get language from Accept-Language header or query parameter
            var language = Request.Query["lang"].FirstOrDefault() ?? GetLanguageFromHeader();

            // Aggregate all initial data
            var initialData = await _initialDataService.GetInitialData(org, app, instanceId, partyId, language);

            // Add routing information to initial data
            // initialData.AppSettings ??= new Altinn.App.Core.Features.Bootstrap.Models.FrontendAppSettings();
            // initialData.AppSettings.CurrentTaskId = taskId;
            // initialData.AppSettings.CurrentPageId = pageId;

            // Generate HTML with embedded data
            var html = GenerateHtml(org, app, initialData);
            return Content(html, "text/html; charset=utf-8");
        }
        return BadRequest();
    }

    /// <summary>
    ///
    /// </summary>
    /// <param name="DataModelName"></param>
    /// <param name="AppId"></param>
    /// <param name="PrefillFields"></param>
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

    private async Task<bool> ShouldShowAppView()
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
            _generalSettings.FrontendBaseUrl?.TrimEnd('/') ?? "https://altinncdn.no/toolkits/altinn-app-frontend/4";
        var appVersion = "4"; // Default version, can be made configurable later

        // Serialize initial data to JSON
        var initialDataJson = JsonSerializer.Serialize(initialData, _jsonSerializerOptions);

        // Get custom CSS and JS if available
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
            var customCssPath = Path.Combine(_env.ContentRootPath, "App", "wwwroot", "css", "custom.css");
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
            var customJsPath = Path.Combine(_env.ContentRootPath, "App", "wwwroot", "js", "custom.js");
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
}


// See comments in the configuration of Antiforgery in MvcConfiguration.cs.
// var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
// if (tokens.RequestToken != null)
// {
//     HttpContext.Response.Cookies.Append(
//         "XSRF-TOKEN",
//         tokens.RequestToken,
//         new CookieOptions
//         {
//             HttpOnly = false, // Make this cookie readable by Javascript.
//         }
//     );
// }
// else
// {
//     string scheme = _env.IsDevelopment() ? "http" : "https";
//     string goToUrl = HttpUtility.UrlEncode($"{scheme}://{Request.Host}/{org}/{app}");
//
//     string redirectUrl = $"{_platformSettings.ApiAuthenticationEndpoint}authentication?goto={goToUrl}";
//
//     if (!string.IsNullOrEmpty(_appSettings.AppOidcProvider))
//     {
//         redirectUrl += "&iss=" + _appSettings.AppOidcProvider;
//     }
//
//     if (dontChooseReportee)
//     {
//         redirectUrl += "&DontChooseReportee=true";
//     }
//
//     return Redirect(redirectUrl);
// }

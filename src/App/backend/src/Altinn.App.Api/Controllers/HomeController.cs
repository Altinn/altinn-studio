using System.Text.Json;
using System.Text.Json.Serialization;
using System.Web;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Controllers;

/// <summary>
/// Provides access to the default home view.
/// </summary>
[Route("{org}/{app}")]
public class HomeController : Controller
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    private readonly IAntiforgery _antiforgery;
    private readonly PlatformSettings _platformSettings;
    private readonly IWebHostEnvironment _env;
    private readonly AppSettings _appSettings;
    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly ILogger<HomeController> _logger;
    private readonly List<string> _onEntryWithInstance = new List<string> { "new-instance", "select-instance" };
    private readonly IBootstrapGlobalService _bootstrapGlobalService;
    private readonly IIndexPageGenerator _indexPageGenerator;
    private readonly IAuthenticationContext _authenticationContext;

    /// <summary>
    /// Initialize a new instance of the <see cref="HomeController"/> class.
    /// </summary>
    /// <param name="serviceProvider">The serviceProvider service used to inject internal services.</param>
    /// <param name="antiforgery">The anti forgery service.</param>
    /// <param name="platformSettings">The platform settings.</param>
    /// <param name="env">The current environment.</param>
    /// <param name="appSettings">The application settings.</param>
    /// <param name="appResources">The application resources service.</param>
    /// <param name="appMetadata">The application metadata service.</param>
    /// <param name="logger">The logger for the controller.</param>
    public HomeController(
        IServiceProvider serviceProvider,
        IAntiforgery antiforgery,
        IOptions<PlatformSettings> platformSettings,
        IWebHostEnvironment env,
        IOptions<AppSettings> appSettings,
        IAppResources appResources,
        IAppMetadata appMetadata,
        ILogger<HomeController> logger
    )
    {
        _antiforgery = antiforgery;
        _platformSettings = platformSettings.Value;
        _env = env;
        _appSettings = appSettings.Value;
        _appResources = appResources;
        _appMetadata = appMetadata;
        _bootstrapGlobalService = serviceProvider.GetRequiredService<IBootstrapGlobalService>();
        _indexPageGenerator = serviceProvider.GetRequiredService<IIndexPageGenerator>();
        _authenticationContext = serviceProvider.GetRequiredService<IAuthenticationContext>();
        _logger = logger;
    }

    /// <summary>
    /// Returns the index view with references to the React app.
    /// </summary>
    /// <param name="org">The application owner short name.</param>
    /// <param name="app">The name of the app</param>
    /// <param name="dontChooseReportee">Parameter to indicate disabling of reportee selection in Altinn Portal.</param>
    /// <param name="returnUrl">Custom returnUrl param that will be verified</param>
    /// <param name="lang">The chosen language to use for default text resources</param>
    [HttpGet]
    [Route("")]
    [Route("instance-selection")]
    [Route("party-selection")]
    [Route("party-selection/{errorCode}")]
    [Route("{pageName:int}")]
    [Route("instance/{partyId}/{instanceGuid}")]
    [Route("instance/{partyId}/{instanceGuid}/{*rest}")]
    public async Task<IActionResult> Index(
        [FromRoute] string org,
        [FromRoute] string app,
        [FromQuery] bool dontChooseReportee,
        [FromQuery] string? returnUrl,
        [FromQuery] string? lang = null
    )
    {
        // See comments in the configuration of Antiforgery in MvcConfiguration.cs.
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

        if (await ShouldShowAppView())
        {
            var partyRedirect = await GetPartySelectionRedirect(org, app);
            if (partyRedirect is not null)
            {
                return partyRedirect;
            }

            if (_indexPageGenerator.HasLegacyIndexCshtml)
            {
                ViewBag.org = org;
                ViewBag.app = app;
                return PartialView("Index");
            }

            string? frontendVersionOverride = null;
            if (_env.IsDevelopment() && HttpContext.Request.Cookies.TryGetValue("frontendVersion", out var cookie))
            {
                frontendVersionOverride = cookie.TrimEnd('/');
            }

            var appGlobalState = await _bootstrapGlobalService.GetGlobalState(org, app, returnUrl, lang);
            var html = await _indexPageGenerator.Generate(org, app, appGlobalState, frontendVersionOverride);
            return Content(html, "text/html; charset=utf-8");
        }

        string scheme = _env.IsDevelopment() ? "http" : "https";
        string goToUrl = HttpUtility.UrlEncode($"{scheme}://{Request.Host}/{org}/{app}");

        string redirectUrl = $"{_platformSettings.ApiAuthenticationEndpoint}authentication?goto={goToUrl}";

        if (!string.IsNullOrEmpty(_appSettings.AppOidcProvider))
        {
            redirectUrl += "&iss=" + _appSettings.AppOidcProvider;
        }

        if (dontChooseReportee)
        {
            redirectUrl += "&DontChooseReportee=true";
        }

        return Redirect(redirectUrl);
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
    [Route("set-query-params")]
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

    private async Task<IActionResult?> GetPartySelectionRedirect(string org, string app)
    {
        // Only redirect for authenticated users
        if (_authenticationContext.Current is not Authenticated.User user)
        {
            return null;
        }

        // Don't redirect if the user is already on a party-selection or instance route
        var path = HttpContext.Request.Path.Value ?? "";
        if (
            path.Contains("/party-selection", StringComparison.OrdinalIgnoreCase)
            || path.Contains("/instance/", StringComparison.OrdinalIgnoreCase)
        )
        {
            return null;
        }

        Authenticated.User.Details details;
        try
        {
            details = await user.LoadDetails(validateSelectedParty: true);
        }
        catch (AuthenticationContextException)
        {
            // Selected party doesn't exist or couldn't be loaded - redirect to party selection with error
            return Redirect($"/{org}/{app}/party-selection/403");
        }

        // If the selected party is not valid, redirect to party-selection/403
        if (details.CanRepresent == false)
        {
            return Redirect($"/{org}/{app}/party-selection/403");
        }

        // If only one valid party, no need to prompt
        if (details.PartiesAllowedToInstantiate.Count <= 1)
        {
            return null;
        }

        ApplicationMetadata application = await _appMetadata.GetApplicationMetadata();

        // If promptForParty is "always", always redirect regardless of user preference
        if (string.Equals(application.PromptForParty, "always", StringComparison.OrdinalIgnoreCase))
        {
            return Redirect($"/{org}/{app}/party-selection/explained");
        }

        // If promptForParty is "never", skip party selection
        if (string.Equals(application.PromptForParty, "never", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        // If the user profile has doNotPromptForParty set, skip party selection
        if (details.Profile.ProfileSettingPreference?.DoNotPromptForParty == true)
        {
            return null;
        }

        // Default behavior with multiple parties: redirect to party selection
        return Redirect($"/{org}/{app}/party-selection/explained");
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
        string? layoutSetsString = _appResources.GetLayoutSetsString();

        // Stateless apps only work with layousets
        if (!string.IsNullOrEmpty(layoutSetsString))
        {
            LayoutSets? layoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsString, _jsonSerializerOptions);
            string? dataTypeId = layoutSets?.Sets?.Find(set => set.Id == application.OnEntry?.Show)?.DataType;
            return application.DataTypes.Find(d => d.Id == dataTypeId);
        }

        return null;
    }
}

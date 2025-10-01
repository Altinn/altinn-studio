using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Service responsible for aggregating all initial data required for application bootstrap.
/// </summary>
internal sealed class InitialDataService : IInitialDataService
{
    private readonly IAppMetadata _appMetadata;
    private readonly IAppResources _appResources;
    private readonly IInstanceClient _instanceClient;
    private readonly IProfileClient _profileClient;
    private readonly IRegisterClient _registerClient;
    private readonly IUserTokenProvider _userTokenProvider;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly IProcessStateService _processStateService;
    private readonly IApplicationLanguage _applicationLanguage;
    private readonly AppSettings _appSettings;
    private readonly PlatformSettings _platformSettings;
    private readonly GeneralSettings _generalSettings;
    private readonly FrontEndSettings _frontEndSettings;

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    /// <summary>
    /// Initializes a new instance of the <see cref="InitialDataService"/> class.
    /// </summary>
    public InitialDataService(
        IAppMetadata appMetadata,
        IAppResources appResources,
        IInstanceClient instanceClient,
        IProfileClient profileClient,
        IRegisterClient registerClient,
        IUserTokenProvider userTokenProvider,
        IHttpContextAccessor httpContextAccessor,
        IAuthenticationContext authenticationContext,
        IProcessStateService processStateService,
        IApplicationLanguage applicationLanguage,
        IOptions<AppSettings> appSettings,
        IOptions<PlatformSettings> platformSettings,
        IOptions<GeneralSettings> generalSettings,
        IOptions<FrontEndSettings> frontEndSettings
    )
    {
        _appMetadata = appMetadata;
        _appResources = appResources;
        _instanceClient = instanceClient;
        _profileClient = profileClient;
        _registerClient = registerClient;
        _userTokenProvider = userTokenProvider;
        _httpContextAccessor = httpContextAccessor;
        _authenticationContext = authenticationContext;
        _processStateService = processStateService;
        _applicationLanguage = applicationLanguage;
        _appSettings = appSettings.Value;
        _platformSettings = platformSettings.Value;
        _generalSettings = generalSettings.Value;
        _frontEndSettings = frontEndSettings.Value;
    }

    /// <inheritdoc />
    public async Task<InitialDataResponse> GetInitialData(
        string org,
        string app,
        string? instanceId = null,
        int? partyId = null,
        string? language = null,
        CancellationToken cancellationToken = default
    )
    {
        var response = new InitialDataResponse();
        var tasks = new List<Task>();

        // Get application metadata
        var appMetadataTask = GetApplicationMetadata(response, cancellationToken);
        tasks.Add(appMetadataTask);

        // Get language and text resources
        language ??= GetLanguageFromContext();
        response.Language = language;
        response.AvailableLanguages = await GetAvailableLanguages();

        var textResourcesTask = GetTextResources(org, app, language, response);
        tasks.Add(textResourcesTask);

        // Get user and party information if authenticated
        var user = _httpContextAccessor.HttpContext?.User;

        if (user?.Identity?.IsAuthenticated == true)
        {
            var userId = user.GetUserIdAsInt();
            if (userId.HasValue)
            {
                var userProfileTask = GetUserProfile(userId.Value, response);
                tasks.Add(userProfileTask);
            }

            if (partyId.HasValue)
            {
                var partyTask = GetParty(partyId.Value, response);
                tasks.Add(partyTask);
            }
        }

        // Get instance data if applicable
        if (!string.IsNullOrEmpty(instanceId))
        {
            var instanceTask = GetInstance(org, app, instanceId, response);
            tasks.Add(instanceTask);
        }

        // Get layout sets and initial layout
        var layoutTask = GetLayoutData(org, app, response);
        tasks.Add(layoutTask);

        // Get footer layout
        var footerTask = GetFooterLayout(response);
        tasks.Add(footerTask);

        // Wait for all tasks to complete
        await Task.WhenAll(tasks);

        // Set frontend settings
        response.AppSettings = new FrontendAppSettings
        {
            CdnUrl = _generalSettings.FrontendBaseUrl,
            ApiUrl = _generalSettings.HostName,
            IsStateless = await IsStatelessApp(response.ApplicationMetadata).ConfigureAwait(false),
            OidcProvider = _appSettings.AppOidcProvider,
        };

        response.PlatformSettings = new FrontendPlatformSettings
        {
            ApiEndpoint = _platformSettings.ApiEndpoint,
            AuthenticationEndpoint = _platformSettings.ApiAuthenticationEndpoint,
            StorageApiEndpoint = _platformSettings.ApiStorageEndpoint,
            ProfileApiEndpoint = _platformSettings.ApiProfileEndpoint,
            AuthorizationApiEndpoint = _platformSettings.ApiAuthorizationEndpoint,
        };

        // Set feature flags from frontend settings
        response.FeatureFlags = GetFeatureFlags();

        return response;
    }

    private async Task GetApplicationMetadata(InitialDataResponse response, CancellationToken cancellationToken)
    {
        response.ApplicationMetadata = await _appMetadata.GetApplicationMetadata();
    }

    private async Task GetTextResources(string org, string app, string language, InitialDataResponse response)
    {
        var textResource = await _appResources.GetTexts(org, app, language);
        if (textResource != null)
        {
            response.TextResources = textResource
                .Resources?.Where(r => r.Id != null && r.Value != null)
                .ToDictionary(r => r.Id ?? string.Empty, r => r.Value ?? string.Empty);
        }
    }

    private async Task GetUserProfile(int userId, InitialDataResponse response)
    {
        try
        {
            response.UserProfile = await _profileClient.GetUserProfile(userId);
        }
        catch
        {
            // Log error but don't fail the entire request
        }
    }

    private async Task GetParty(int partyId, InitialDataResponse response)
    {
        try
        {
            response.Party = await _registerClient.GetPartyUnchecked(partyId, CancellationToken.None);

            // Check if the party can instantiate using the authentication context
            // Only check for regular users, other auth types will get null
            var currentAuth = _authenticationContext.Current;
            if (currentAuth is Authenticated.User)
            {
                response.CanInstantiate = await CanPartyInstantiate(partyId);
            }
        }
        catch
        {
            // Log error but don't fail the entire request
        }
    }

    private async Task GetInstance(string org, string app, string instanceId, InitialDataResponse response)
    {
        try
        {
            var instanceOwnerPartyId = ParseInstanceOwnerPartyId(instanceId);
            var instanceGuid = ParseInstanceGuid(instanceId);

            if (instanceOwnerPartyId.HasValue && instanceGuid.HasValue)
            {
                response.Instance = await _instanceClient.GetInstance(
                    app,
                    org,
                    instanceOwnerPartyId.Value,
                    instanceGuid.Value
                );

                // Get process state if instance has a process
                if (response.Instance?.Process != null)
                {
                    var user = _httpContextAccessor.HttpContext?.User;
                    if (user != null)
                    {
                        response.ProcessState = await _processStateService.GetAuthorizedProcessState(
                            response.Instance,
                            response.Instance.Process,
                            user
                        );
                    }
                }
            }
        }
        catch
        {
            // Log error but don't fail the entire request
        }
    }

    private Task GetLayoutData(string org, string app, InitialDataResponse response)
    {
        try
        {
            // Get layout sets
            var layoutSetsJson = _appResources.GetLayoutSets();
            if (!string.IsNullOrEmpty(layoutSetsJson))
            {
                response.LayoutSets = JsonSerializer.Deserialize<LayoutSets>(layoutSetsJson, _jsonSerializerOptions);
            }

            // Get layout settings
            var layoutSettingsJson = _appResources.GetLayoutSettingsString();
            if (!string.IsNullOrEmpty(layoutSettingsJson))
            {
                response.LayoutSettings = JsonSerializer.Deserialize<object>(
                    layoutSettingsJson,
                    _jsonSerializerOptions
                );
            }

            // Get initial layout if available
            var initialLayoutSetId = response.LayoutSets?.Sets?.FirstOrDefault()?.Id;
            if (!string.IsNullOrEmpty(initialLayoutSetId))
            {
                var layoutJson = _appResources.GetLayoutsForSet(initialLayoutSetId);
                if (!string.IsNullOrEmpty(layoutJson))
                {
                    response.Layout = JsonSerializer.Deserialize<object>(layoutJson, _jsonSerializerOptions);
                }
            }
        }
        catch
        {
            // Log error but don't fail the entire request
        }

        return Task.CompletedTask;
    }

    private string GetLanguageFromContext()
    {
        var acceptLanguageHeader = _httpContextAccessor.HttpContext?.Request.Headers["Accept-Language"].ToString();
        if (!string.IsNullOrEmpty(acceptLanguageHeader))
        {
            var languages = acceptLanguageHeader.Split(',');
            foreach (var lang in languages)
            {
                var cleanLang = lang.Split(';')[0].Trim().Substring(0, 2).ToLower(CultureInfo.InvariantCulture);
                if (_generalSettings.LanguageCodes?.Contains(cleanLang) == true)
                {
                    return cleanLang;
                }
            }
        }
        return "nb"; // Default to Norwegian Bokmål
    }

    private async Task<List<Altinn.App.Core.Models.ApplicationLanguage>> GetAvailableLanguages()
    {
        return await _applicationLanguage.GetApplicationLanguages();
    }

    private Dictionary<string, bool> GetFeatureFlags()
    {
        var flags = new Dictionary<string, bool>();

        // Add feature flags from FrontEndSettings
        if (_frontEndSettings != null)
        {
            // Add any frontend feature flags here
            // For example:
            // flags["enableNewFeature"] = _frontEndSettings.EnableNewFeature;
        }

        return flags;
    }

    private static Task<bool> IsStatelessApp(ApplicationMetadata? applicationMetadata)
    {
        if (applicationMetadata?.OnEntry == null)
        {
            return Task.FromResult(false);
        }

        var onEntryWithInstance = new List<string> { "new-instance", "select-instance" };
        return Task.FromResult(!onEntryWithInstance.Contains(applicationMetadata.OnEntry.Show));
    }

    private static int? ParseInstanceOwnerPartyId(string instanceId)
    {
        var parts = instanceId.Split('/');
        if (parts.Length >= 1 && int.TryParse(parts[0], out var partyId))
        {
            return partyId;
        }
        return null;
    }

    private static Guid? ParseInstanceGuid(string instanceId)
    {
        var parts = instanceId.Split('/');
        if (parts.Length >= 2 && Guid.TryParse(parts[1], out var guid))
        {
            return guid;
        }
        return null;
    }

    private async Task<bool> CanPartyInstantiate(int partyId)
    {
        var currentAuth = _authenticationContext.Current;

        if (currentAuth is not Authenticated.User auth)
        {
            throw new UnauthorizedAccessException(
                "User must be authenticated as a regular user to check instantiation permissions"
            );
        }

        var details = await auth.LoadDetails(validateSelectedParty: false);
        return details.CanInstantiateAsParty(partyId);
    }

    private async Task GetFooterLayout(InitialDataResponse response)
    {
        try
        {
            var footerJson = await _appResources.GetFooter();
            if (!string.IsNullOrEmpty(footerJson))
            {
                response.FooterLayout = JsonSerializer.Deserialize<object>(footerJson, _jsonSerializerOptions);
            }
        }
        catch
        {
            // Log error but don't fail the entire request
        }
    }
}

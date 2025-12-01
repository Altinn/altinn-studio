using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Testing;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Service responsible for aggregating all initial data required for application bootstrap.
/// </summary>
public sealed class InitialDataService : IInitialDataService
{
    private readonly IAppMetadata _appMetadata;
    private readonly IAppResources _appResources;
    private readonly IInstanceClient _instanceClient;
    private readonly IProfileClient _profileClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IProcessStateService _processStateService;
    private readonly IApplicationLanguage _applicationLanguage;
    private readonly IMockDataHelper? _mockDataHelper;
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
        IHttpContextAccessor httpContextAccessor,
        IAuthenticationContext authenticationContext,
        IProcessStateService processStateService,
        IApplicationLanguage applicationLanguage,
        IOptions<AppSettings> appSettings,
        IOptions<PlatformSettings> platformSettings,
        IOptions<GeneralSettings> generalSettings,
        IOptions<FrontEndSettings> frontEndSettings,
        IMockDataHelper? mockDataHelper = null
    )
    {
        _appMetadata = appMetadata;
        _appResources = appResources;
        _instanceClient = instanceClient;
        _profileClient = profileClient;
        _httpContextAccessor = httpContextAccessor;
        _processStateService = processStateService;
        _applicationLanguage = applicationLanguage;
        _mockDataHelper = mockDataHelper;
        _appSettings = appSettings.Value;
        _platformSettings = platformSettings.Value;
        _generalSettings = generalSettings.Value;
        _frontEndSettings = frontEndSettings.Value;
    }

    /// <inheritdoc />
    public async Task<InitialDataResponse> GetInitialData(
        string org,
        string app,
        string? language = null,
        CancellationToken cancellationToken = default
    )
    {
        language ??= GetLanguageFromContext();
        var tasks = new List<Task>();

        Task<ApplicationMetadata> appMetadataTask = GetApplicationMetadata(cancellationToken);
        tasks.Add(appMetadataTask);

        Task<TextResource?> textResourcesTask = GetTextResources(org, app, language);
        tasks.Add(textResourcesTask);

        Task<object?> footerLayoutTask = GetFooterLayout();
        tasks.Add(footerLayoutTask);

        Task<List<Core.Models.ApplicationLanguage>> availableLanguagesTask =
            _applicationLanguage.GetApplicationLanguages();
        tasks.Add(availableLanguagesTask);

        await Task.WhenAll(tasks);
        var applicationMetadata = await appMetadataTask;
        var textResources = await textResourcesTask;
        var footerLayout = await footerLayoutTask;
        var availableLanguages = await availableLanguagesTask;

        FrontEndSettings frontEndSettings = GetFrontendSettings();
        LayoutSets? layoutSets = GetLayoutSets();
        object? layout = GetLayout(layoutSets);
        object? layoutSettings = GetLayoutSettings();
        Dictionary<string, bool> featureFlags = GetFeatureFlags();
        FrontendPlatformSettings frontendPlatformSettings = new()
        {
            ApiEndpoint = _platformSettings.ApiEndpoint,
            AuthenticationEndpoint = _platformSettings.ApiAuthenticationEndpoint,
            StorageApiEndpoint = _platformSettings.ApiStorageEndpoint,
            ProfileApiEndpoint = _platformSettings.ApiProfileEndpoint,
            AuthorizationApiEndpoint = _platformSettings.ApiAuthorizationEndpoint,
        };

        return new InitialDataResponse
        {
            ApplicationMetadata = applicationMetadata,
            TextResources = textResources,
            Language = language,
            AvailableLanguages = availableLanguages,
            FooterLayout = footerLayout,
            LayoutSets = layoutSets,
            Layout = layout,
            LayoutSettings = layoutSettings,
            FeatureFlags = featureFlags,
            PlatformSettings = frontendPlatformSettings,
            FrontendSettings = frontEndSettings,
        };
    }

    /// <inheritdoc />
    public async Task<InitialDataResponseAuthenticated> GetInitialDataAuthenticated(
        string org,
        string app,
        Authenticated.User user,
        Authenticated.User.Details userDetails,
        string? instanceId = null,
        string? language = null,
        CancellationToken cancellationToken = default
    )
    {
        var tasks = new List<Task>();

        Task<InitialDataResponse> initialDataResponseTask = GetInitialData(org, app, language, cancellationToken);
        tasks.Add(initialDataResponseTask);

        Task<UserProfile> userProfileTask = GetUserProfile(user.UserId);
        tasks.Add(userProfileTask);

        Task<Instance?> instanceTask = GetInstance(org, app, instanceId);
        tasks.Add(instanceTask);

        Task<AppProcessState?> appProcessStateTask = GetAppProcessState(() => instanceTask, user.GetClaimsPrincipal());
        tasks.Add(appProcessStateTask);

        // Wait for all tasks to complete
        await Task.WhenAll(tasks);
        var initialDataResponse = await initialDataResponseTask;
        var userProfile = await userProfileTask;
        var instance = await instanceTask;
        var appProcessState = await appProcessStateTask;

        bool canPartyInstantiate = userDetails.CanInstantiateAsParty(userDetails.UserParty.PartyId);
        Party party = GetParty(userDetails);

        return new InitialDataResponseAuthenticated
        {
            ApplicationMetadata = initialDataResponse.ApplicationMetadata,
            TextResources = initialDataResponse.TextResources,
            Language = initialDataResponse.Language,
            AvailableLanguages = initialDataResponse.AvailableLanguages,
            FooterLayout = initialDataResponse.FooterLayout,
            LayoutSets = initialDataResponse.LayoutSets,
            Layout = initialDataResponse.Layout,
            LayoutSettings = initialDataResponse.LayoutSettings,
            FeatureFlags = initialDataResponse.FeatureFlags,
            PlatformSettings = initialDataResponse.PlatformSettings,
            FrontendSettings = initialDataResponse.FrontendSettings,

            CanInstantiate = canPartyInstantiate,
            UserProfile = userProfile,
            Party = party,
            Instance = instance,
            ProcessState = appProcessState,
        };
    }

    private async Task<ApplicationMetadata> GetApplicationMetadata(CancellationToken cancellationToken)
    {
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();

        // Merge with mock data if available
        if (_mockDataHelper is not null)
        {
            return MergeWithMockData(appMetadata, "applicationMetadata", _mockDataHelper.MergeApplicationMetadata);
        }

        return appMetadata;
    }

    private async Task<TextResource?> GetTextResources(string org, string app, string language)
    {
        return await _appResources.GetTexts(org, app, language);
    }

    private async Task<UserProfile> GetUserProfile(int userId)
    {
        try
        {
            // Merge with mock data if available
            {
                var userProfile =
                    await _profileClient.GetUserProfile(userId)
                    ?? throw new Exception("Failed to get user profile information");

                if (_mockDataHelper is null)
                {
                    return userProfile;
                }

                return MergeWithMockData(userProfile, "userProfile", _mockDataHelper.MergeUserProfile);
            }
        }
        catch
        {
            throw new Exception("Failed to get user profile information");
        }
    }

    private Party GetParty(Authenticated.User.Details userDetails)
    {
        try
        {
            var party = userDetails.UserParty;
            if (_mockDataHelper is null)
            {
                return party;
            }

            var mergedList = MergeWithMockData(new List<Party> { party }, "parties", _mockDataHelper.MergeParties);
            var result = mergedList.FirstOrDefault(p => p.PartyId == party.PartyId) ?? party;
            return result;
        }
        catch
        {
            throw new Exception("Failed to get party information");
        }
    }

    private async Task<Instance?> GetInstance(string org, string app, string? instanceId)
    {
        if (string.IsNullOrEmpty(instanceId))
        {
            return null;
        }

        var instanceOwnerPartyId = ParseInstanceOwnerPartyId(instanceId);
        var instanceGuid = ParseInstanceGuid(instanceId);

        if (!instanceOwnerPartyId.HasValue || !instanceGuid.HasValue)
        {
            throw new ArgumentException("Invalid instance ID format");
        }

        return await _instanceClient.GetInstance(app, org, instanceOwnerPartyId.Value, instanceGuid.Value);
    }

    private async Task<AppProcessState?> GetAppProcessState(Func<Task<Instance?>> GetInstance, ClaimsPrincipal user)
    {
        Instance? instance = await GetInstance();

        if (instance is null)
        {
            return null;
        }

        return await _processStateService.ConvertAndAuthorizeActions(instance, instance.Process, user);
    }

    private string GetLanguageFromContext()
    {
        var acceptLanguageHeader = _httpContextAccessor.HttpContext?.Request.Headers.AcceptLanguage.ToString();
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

    private Dictionary<string, bool> GetFeatureFlags()
    {
        var flags = new Dictionary<string, bool>();

        // Add feature flags from FrontEndSettings
        if (_frontEndSettings is not null)
        {
            // Add any frontend feature flags here
            // For example:
            // flags["enableNewFeature"] = _frontEndSettings.EnableNewFeature;
        }

        return flags;
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

    private LayoutSets? GetLayoutSets()
    {
        var layoutSetsJson = _appResources.GetLayoutSets();
        return TryDeserialize<LayoutSets>(layoutSetsJson);
    }

    private object? GetLayoutSettings()
    {
        var layoutSettingsJson = _appResources.GetLayoutSettingsString();
        return TryDeserialize<object>(layoutSettingsJson);
    }

    private object? GetLayout(LayoutSets? layoutSets)
    {
        var initialLayoutSetId = layoutSets?.Sets?.FirstOrDefault()?.Id;

        var layoutJson = !string.IsNullOrEmpty(initialLayoutSetId)
            ? _appResources.GetLayoutsForSet(initialLayoutSetId)
            : null;

        if (string.IsNullOrEmpty(layoutJson))
        {
            return null;
        }
        return TryDeserialize<object>(layoutJson);
    }

    private async Task<object?> GetFooterLayout()
    {
        var footerJson = await _appResources.GetFooter();
        return TryDeserialize<object>(footerJson);
    }

    private static T? TryDeserialize<T>(string? json)
        where T : class
    {
        if (string.IsNullOrEmpty(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(json, _jsonSerializerOptions);
        }
        catch
        {
            // TODO: Log error
            return null;
        }
    }

    private FrontEndSettings GetFrontendSettings()
    {
        FrontEndSettings frontEndSettings = _frontEndSettings;

        // Adding key from _appSettings to be backwards compatible.
        if (
            !frontEndSettings.ContainsKey(nameof(_appSettings.AppOidcProvider))
            && !string.IsNullOrEmpty(_appSettings.AppOidcProvider)
        )
        {
            frontEndSettings.Add(nameof(_appSettings.AppOidcProvider), _appSettings.AppOidcProvider);
        }

        return frontEndSettings;
    }

    /// <summary>
    /// Merges mock data with real data using the provided merge function.
    /// </summary>
    /// <typeparam name="T">The type of object to merge.</typeparam>
    /// <param name="realData">The real data from the service.</param>
    /// <param name="mockDataKey">The key to look for in the mock data dictionary.</param>
    /// <param name="mergeFunction">The function to use for merging.</param>
    /// <returns>The merged object, or the original object if no mock data is available.</returns>
    private T MergeWithMockData<T>(T realData, string mockDataKey, Func<T, object?, T>? mergeFunction)
        where T : class
    {
        if (_mockDataHelper is null)
        {
            return realData;
        }

        if (mergeFunction is null)
            return realData;

        var mockData = GetMockData();
        if (mockData?.TryGetValue(mockDataKey, out var mockValue) == true)
        {
            return mergeFunction(realData, mockValue);
        }

        return realData;
    }

    /// <summary>
    /// Retrieves mock data from the HTTP context og X-Mock-Data header if available.
    /// </summary>
    /// <returns>A dictionary containing mock data, or null if no mock data is available.</returns>
    public Dictionary<string, object>? GetMockData()
    {
        Dictionary<string, object>? mockData = null;

        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext is null)
        {
            return null;
        }

        if (
            httpContext.Items.TryGetValue("MockData", out var mockDataObj)
            && mockDataObj is Dictionary<string, object> itemsMockData
        )
        {
            mockData = itemsMockData;
        }
        else if (httpContext.Request.Headers.TryGetValue("X-Mock-Data", out var mockDataHeader))
        {
            mockData = TryDeserialize<Dictionary<string, object>>(mockDataHeader);
        }

        return mockData;
    }
}

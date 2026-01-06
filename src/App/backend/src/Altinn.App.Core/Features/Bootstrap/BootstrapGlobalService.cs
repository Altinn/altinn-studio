using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Features.Testing;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.Platform.Profile.Enums;
using Altinn.Platform.Register.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

internal sealed class BootstrapGlobalService : IBootstrapGlobalService
{
    // public Task<BootstrapGlobalResponse> GetGlobalState(string org, string app, string? instanceId = null, int? partyId = null, string? language = null,
    //     CancellationToken cancellationToken = default)
    // {
    //     throw new NotImplementedException();
    // }

    private readonly IAppMetadata _appMetadata;
    private readonly IAppResources _appResources;
    private readonly IInstanceClient _instanceClient;
    private readonly IProfileClient _profileClient;
    private readonly IRegisterClient _registerClient;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IAuthenticationContext _authenticationContext;
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
    /// Initializes a new instance of the <see cref="BootstrapInstanceService"/> class.
    /// </summary>
    public BootstrapGlobalService(
        IAppMetadata appMetadata,
        IAppResources appResources,
        IInstanceClient instanceClient,
        IProfileClient profileClient,
        IRegisterClient registerClient,
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
        _registerClient = registerClient;
        _httpContextAccessor = httpContextAccessor;
        _authenticationContext = authenticationContext;
        _processStateService = processStateService;
        _applicationLanguage = applicationLanguage;
        _mockDataHelper = mockDataHelper;
        _appSettings = appSettings.Value;
        _platformSettings = platformSettings.Value;
        _generalSettings = generalSettings.Value;
        _frontEndSettings = frontEndSettings.Value;
    }

    public async Task<BootstrapGlobalResponse> GetGlobalState(
        string org,
        string app,
        string? language = null,
        CancellationToken cancellationToken = default
    )
    {
        var response = new BootstrapGlobalResponse();
        var tasks = new List<Task>();

        // Get application metadata
        var appMetadataTask = GetApplicationMetadata(response, cancellationToken);
        tasks.Add(appMetadataTask);
        response.AvailableLanguages = await GetAvailableLanguages();

        // Get user and party information if authenticated, or mock data if available
        var user = _httpContextAccessor.HttpContext?.User;
        var mockData = GetMockData();

        if (user?.Identity?.IsAuthenticated == true)
        {
            var userId = user.GetUserIdAsInt();
            if (userId.HasValue)
            {
                var userProfileTask = GetUserProfile(userId.Value, response);
                tasks.Add(userProfileTask);
            }
        }
        else if (_mockDataHelper != null && mockData != null)
        {
            // Even without authentication, create mock data if available
            if (mockData.ContainsKey("userProfile"))
            {
                var mockUserProfileTask = GetMockUserProfile(response);
                tasks.Add(mockUserProfileTask);
            }
        }

        // Get footer layout
        var footerTask = GetFooterLayout(response);
        tasks.Add(footerTask);

        // Set frontend settings
        response.FrontEndSettings = _frontEndSettings;

        // Get language and text resources
        language ??= GetLanguageFromContext();
        response.AvailableLanguages = await GetAvailableLanguages();

        var textResourcesTask = GetTextResources(org, app, language, response);
        tasks.Add(textResourcesTask);

        await Task.WhenAll(tasks);
        return response;
    }

    private async Task GetApplicationMetadata(BootstrapGlobalResponse response, CancellationToken cancellationToken)
    {
        response.ApplicationMetadata = await _appMetadata.GetApplicationMetadata();
        // Merge with mock data if available
        if (_mockDataHelper != null && response.ApplicationMetadata != null)
        {
            response.ApplicationMetadata = MergeWithMockData(
                response.ApplicationMetadata,
                "applicationMetadata",
                _mockDataHelper.MergeApplicationMetadata
            );
        }
    }

    /// <summary>
    /// Merges mock data with real data using the provided merge function.
    /// </summary>
    /// <typeparam name="T">The type of object to merge.</typeparam>
    /// <param name="realData">The real data from the service.</param>
    /// <param name="mockDataKey">The key to look for in the mock data dictionary.</param>
    /// <param name="mergeFunction">The function to use for merging.</param>
    /// <returns>The merged object, or the original object if no mock data is available.</returns>
    private T? MergeWithMockData<T>(T? realData, string mockDataKey, Func<T, object?, T>? mergeFunction)
        where T : class
    {
        if (realData == null || mergeFunction == null)
            return realData;

        var mockData = GetMockData();
        if (mockData?.TryGetValue(mockDataKey, out var mockValue) == true)
        {
            return mergeFunction(realData, mockValue);
        }

        return realData;
    }

    /// <summary>
    /// Retrieves mock data from the HTTP context if available.
    /// </summary>
    /// <returns>A dictionary containing mock data, or null if no mock data is available.</returns>
    private Dictionary<string, object>? GetMockData()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.Items.TryGetValue("MockData", out var mockData) == true)
        {
            return mockData as Dictionary<string, object>;
        }
        return null;
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

    private async Task GetUserProfile(int userId, BootstrapGlobalResponse response)
    {
        try
        {
            response.UserProfile = await _profileClient.GetUserProfile(userId);

            // Merge with mock data if available
            if (_mockDataHelper != null && response.UserProfile != null)
            {
                response.UserProfile = MergeWithMockData(
                    response.UserProfile,
                    "userProfile",
                    _mockDataHelper.MergeUserProfile
                );
            }
        }
        catch
        {
            // Log error but don't fail the entire request
        }
    }

    private Task GetMockUserProfile(BootstrapGlobalResponse response)
    {
        try
        {
            // Create a minimal user profile that can be merged with mock data
            var baseUserProfile = new Altinn.Platform.Profile.Models.UserProfile
            {
                UserId = 0, // Default placeholder
                UserName = "",
                Email = "",
                PhoneNumber = "",
                PartyId = 0,
                UserType = UserType.SSNIdentified,
                ProfileSettingPreference = new Altinn.Platform.Profile.Models.ProfileSettingPreference(),
            };

            // Merge with mock data
            if (_mockDataHelper != null)
            {
                response.UserProfile = MergeWithMockData(
                    baseUserProfile,
                    "userProfile",
                    _mockDataHelper.MergeUserProfile
                );
            }
            else
            {
                response.UserProfile = baseUserProfile;
            }
        }
        catch
        {
            // Log error but don't fail the entire request
        }

        return Task.CompletedTask;
    }

    private async Task GetFooterLayout(BootstrapGlobalResponse response)
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

    private async Task GetTextResources(string org, string app, string language, BootstrapGlobalResponse response)
    {
        response.TextResources = await _appResources.GetTexts(org, app, language);
    }
}

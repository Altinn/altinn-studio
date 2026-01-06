using System.Diagnostics;
using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Enums;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Service responsible for aggregating all initial data required for application bootstrap.
/// </summary>
internal sealed class BootstrapInstanceService : IBootstrapInstanceService
{
    private readonly IAppResources _appResources;
    private readonly IInstanceClient _instanceClient;
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
    /// Initializes a new instance of the <see cref="BootstrapInstanceService"/> class.
    /// </summary>
    public BootstrapInstanceService(
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
        IOptions<FrontEndSettings> frontEndSettings
    )
    {
        _appResources = appResources;
        _instanceClient = instanceClient;
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
    public async Task<BootstrapInstanceResponse> GetInitialData(
        string org,
        string app,
        string instanceId,
        int? partyId = null,
        string? language = null,
        CancellationToken cancellationToken = default
    )
    {
        var response = new BootstrapInstanceResponse();
        var tasks = new List<Task>();
        // Get instance data if applicable
        Instance? instance = null;

        // TODO: hva skal skje om det ikke finnes en instans, error?
        if (!string.IsNullOrEmpty(instanceId))
        {
            var instanceGuid = ParseInstanceGuid(instanceId);
            var instanceOwnerPartyId = ParseInstanceOwnerPartyId(instanceId);
            instance = await _instanceClient.GetInstance(app, org, instanceOwnerPartyId.Value, instanceGuid.Value);
            response.Instance = instance;
        }

        // Get layout sets and initial layout
        var layoutTask = GetLayoutData(org, app, response, instance?.Process?.CurrentTask?.ElementId);
        tasks.Add(layoutTask);

        // Get footer layout
        var footerTask = GetFooterLayout(response);
        tasks.Add(footerTask);

        // Wait for all tasks to complete
        await Task.WhenAll(tasks);

        // Set frontend settings
        FrontEndSettings frontEndSettings = _frontEndSettings;

        response.FrontendSettings = frontEndSettings;

        // Set feature flags from frontend settings
        response.FeatureFlags = GetFeatureFlags();

        return response;
    }

    private Task GetLayoutData(string org, string app, BootstrapInstanceResponse response, string? taskId)
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
            // var initialLayoutSetId = (
            //     !string.IsNullOrEmpty(taskId)
            //         ? response.LayoutSets?.Sets?.FirstOrDefault(s => s.Id == taskId)
            //         : response.LayoutSets?.Sets?.FirstOrDefault()
            // )?.Id;
            //
            //

            if (!string.IsNullOrEmpty(taskId))
            {
                var currentLayoutSet = _appResources.GetLayoutSetForTask(taskId);
                if (currentLayoutSet != null)
                {
                    var layoutJson = _appResources.GetLayoutsForSet(currentLayoutSet.Id);
                    if (!string.IsNullOrEmpty(layoutJson))
                    {
                        response.Layout = JsonSerializer.Deserialize<object>(layoutJson, _jsonSerializerOptions);
                    }
                }
            }

            // Debugger.Break();
            // if (!string.IsNullOrEmpty(initialLayoutSetId))
            // {
            //     var layoutJson = _appResources.GetLayoutsForSet(initialLayoutSetId);
            //     if (!string.IsNullOrEmpty(layoutJson))
            //     {
            //         response.Layout = JsonSerializer.Deserialize<object>(layoutJson, _jsonSerializerOptions);
            //     }
            // }
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

    // TODO fjerne støtte for Feature Flag i første v10? Re-implementere flag ved behov, om behovet kommer.
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

    private async Task GetFooterLayout(BootstrapInstanceResponse response)
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
}

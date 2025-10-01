using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Bootstrap.Models;

/// <summary>
/// Represents the aggregated initial data required for application bootstrap.
/// </summary>
public sealed class InitialDataResponse
{
    /// <summary>
    /// Application metadata.
    /// </summary>
    [JsonPropertyName("applicationMetadata")]
    public ApplicationMetadata? ApplicationMetadata { get; set; }

    /// <summary>
    /// Current instance data if applicable.
    /// </summary>
    [JsonPropertyName("instance")]
    public Instance? Instance { get; set; }

    /// <summary>
    /// User profile information.
    /// </summary>
    [JsonPropertyName("userProfile")]
    public UserProfile? UserProfile { get; set; }

    /// <summary>
    /// Current party information.
    /// </summary>
    [JsonPropertyName("party")]
    public Party? Party { get; set; }

    /// <summary>
    /// Whether the current party is allowed to instantiate new instances.
    /// </summary>
    [JsonPropertyName("canInstantiate")]
    public bool? CanInstantiate { get; set; }

    /// <summary>
    /// Text resources for the current language.
    /// </summary>
    [JsonPropertyName("textResources")]
    public TextResource? TextResources { get; set; }

    /// <summary>
    /// Layout sets if available.
    /// </summary>
    [JsonPropertyName("layoutSets")]
    public LayoutSets? LayoutSets { get; set; }

    /// <summary>
    /// Initial layout if applicable.
    /// </summary>
    [JsonPropertyName("layout")]
    public object? Layout { get; set; }

    /// <summary>
    /// Layout settings.
    /// </summary>
    [JsonPropertyName("layoutSettings")]
    public object? LayoutSettings { get; set; }

    /// <summary>
    /// Current language code.
    /// </summary>
    [JsonPropertyName("language")]
    public string? Language { get; set; }

    /// <summary>
    /// Available language options.
    /// </summary>
    [JsonPropertyName("availableLanguages")]
    public List<ApplicationLanguage>? AvailableLanguages { get; set; }

    /// <summary>
    /// Frontend feature flags.
    /// </summary>
    [JsonPropertyName("featureFlags")]
    public Dictionary<string, bool>? FeatureFlags { get; set; }

    /// <summary>
    /// Application settings visible to frontend.
    /// </summary>
    [JsonPropertyName("appSettings")]
    public FrontendAppSettings? AppSettings { get; set; }

    /// <summary>
    /// Platform settings.
    /// </summary>
    [JsonPropertyName("platformSettings")]
    public FrontendPlatformSettings? PlatformSettings { get; set; }

    /// <summary>
    /// Process state information if instance is available.
    /// </summary>
    [JsonPropertyName("processState")]
    public AppProcessState? ProcessState { get; set; }

    /// <summary>
    /// Footer layout configuration.
    /// </summary>
    [JsonPropertyName("footerLayout")]
    public object? FooterLayout { get; set; }
}

/// <summary>
/// Frontend-specific application settings.
/// </summary>
public sealed class FrontendAppSettings
{
    /// <summary>
    /// CDN base URL.
    /// </summary>
    [JsonPropertyName("cdnUrl")]
    public string? CdnUrl { get; set; }

    /// <summary>
    /// API base URL.
    /// </summary>
    [JsonPropertyName("apiUrl")]
    public string? ApiUrl { get; set; }

    /// <summary>
    /// Whether the app is stateless.
    /// </summary>
    [JsonPropertyName("isStateless")]
    public bool IsStateless { get; set; }

    /// <summary>
    /// OIDC provider if configured.
    /// </summary>
    [JsonPropertyName("oidcProvider")]
    public string? OidcProvider { get; set; }

    /// <summary>
    /// Current task ID from route (for deep linking).
    /// </summary>
    [JsonPropertyName("currentTaskId")]
    public string? CurrentTaskId { get; set; }

    /// <summary>
    /// Current page ID from route (for deep linking).
    /// </summary>
    [JsonPropertyName("currentPageId")]
    public string? CurrentPageId { get; set; }
}

/// <summary>
/// Frontend-specific platform settings.
/// </summary>
public sealed class FrontendPlatformSettings
{
    /// <summary>
    /// Platform API endpoint.
    /// </summary>
    [JsonPropertyName("apiEndpoint")]
    public string? ApiEndpoint { get; set; }

    /// <summary>
    /// Authentication endpoint.
    /// </summary>
    [JsonPropertyName("authenticationEndpoint")]
    public string? AuthenticationEndpoint { get; set; }

    /// <summary>
    /// Storage API endpoint.
    /// </summary>
    [JsonPropertyName("storageApiEndpoint")]
    public string? StorageApiEndpoint { get; set; }

    /// <summary>
    /// Profile API endpoint.
    /// </summary>
    [JsonPropertyName("profileApiEndpoint")]
    public string? ProfileApiEndpoint { get; set; }

    /// <summary>
    /// Authorization API endpoint.
    /// </summary>
    [JsonPropertyName("authorizationApiEndpoint")]
    public string? AuthorizationApiEndpoint { get; set; }
}

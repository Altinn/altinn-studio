using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Bootstrap.Models;

/// <summary>
/// Represents the aggregated initial data required for application bootstrap.
/// </summary>
public sealed class BootstrapInstanceResponse
{
    /// <summary>
    /// Current instance data if applicable.
    /// </summary>
    [JsonPropertyName("instance")]
    public Instance? Instance { get; set; }

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
    /// Frontend feature flags.
    /// </summary>
    [JsonPropertyName("featureFlags")]
    public Dictionary<string, bool>? FeatureFlags { get; set; }

    /// <summary>
    /// Application settings visible to frontend.
    /// </summary>
    [JsonPropertyName("appSettings")]
    public FrontEndSettings? AppSettings { get; set; }

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

    /// <summary>
    /// Frontend settings
    /// </summary>
    [JsonPropertyName("frontendSettings")]
    public object? FrontendSettings { get; set; }
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

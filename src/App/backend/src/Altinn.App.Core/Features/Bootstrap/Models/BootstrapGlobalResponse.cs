using System.Text.Json.Serialization;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Features.Bootstrap.Models;

internal class BootstrapGlobalResponse
{
    /// <summary>
    /// Application metadata.
    /// </summary>
    [JsonPropertyName("applicationMetadata")]
    public required ApplicationMetadata ApplicationMetadata { get; set; }

    /// <summary>
    /// Footer layout configuration.
    /// </summary>
    [JsonPropertyName("footer")]
    public object? Footer { get; set; }

    /// <summary>
    /// Layout sets configuration.
    /// </summary>
    [JsonPropertyName("layoutSets")]
    public required LayoutSets LayoutSets { get; set; }

    /// <summary>
    /// FrontendSettings layout configuration.
    /// </summary>
    [JsonPropertyName("frontendSettings")]
    public object? FrontEndSettings { get; set; }

    /// <summary>
    /// Available language options.
    /// </summary>
    [JsonPropertyName("availableLanguages")]
    public required List<ApplicationLanguage> AvailableLanguages { get; set; }

    /// <summary>
    /// Verified returnUrl
    /// </summary>
    [JsonPropertyName("returnUrl")]
    public string? ReturnUrl { get; set; }

    /// <summary>
    /// User profile information.
    /// </summary>
    [JsonPropertyName("userProfile")]
    public UserProfile? UserProfile { get; set; }

    /// Verified returnUrl
    /// </summary>
    [JsonPropertyName("selectedParty")]
    public Party? SelectedParty { get; set; }
}

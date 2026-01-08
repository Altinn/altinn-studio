using System.Text.Json.Serialization;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Bootstrap.Models;

public class BootstrapGlobalResponse
{
    /// <summary>
    /// Application metadata.
    /// </summary>
    [JsonPropertyName("applicationMetadata")]
    public ApplicationMetadata ApplicationMetadata { get; set; }

    /// <summary>
    /// Available language options.
    /// </summary>
    [JsonPropertyName("availableLanguages")]
    public List<ApplicationLanguage> AvailableLanguages { get; set; }

    /// <summary>
    /// Footer layout configuration.
    /// </summary>
    [JsonPropertyName("footerLayout")]
    public object? FooterLayout { get; set; }

    /// <summary>
    /// User profile information.
    /// </summary>
    [JsonPropertyName("userProfile")]
    public UserProfile UserProfile { get; set; }

    /// <summary>
    /// Text resources for the current language.
    /// </summary>
    [JsonPropertyName("textResources")]
    public TextResource? TextResources { get; set; }
}

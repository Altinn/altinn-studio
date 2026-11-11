using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Preview.Configuration;

/// <summary>
/// The service's settings, from the <c>Preview</c> section.
/// </summary>
internal sealed class PreviewOptions
{
    public const string SectionName = "Preview";

    /// <summary>
    /// The directory that holds Designer's working copies, as <c>{developer}/{org}/{app}</c>.
    /// </summary>
    [Required]
    public string RepositoryRoot { get; set; } = string.Empty;

    /// <summary>
    /// Where browsers reach the service, such as <c>https://preview.example</c>. Session URLs start with it.
    /// </summary>
    [Required]
    public required Uri PublicBaseUrl { get; set; }

    /// <summary>
    /// The origin of the Studio environment that embeds preview, such as <c>https://altinn.studio</c>. Browsers show
    /// preview only in frames on this origin.
    /// </summary>
    [Required]
    public required Uri StudioOrigin { get; set; }

    /// <summary>
    /// The connection string of the Redis that keeps the sessions. No other service uses it.
    /// </summary>
    [Required]
    public string RedisConnectionString { get; set; } = string.Empty;
}

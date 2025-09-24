namespace Altinn.App.Core.Models;

/// <summary>
/// Class for style config
/// </summary>
public class StylesConfig
{
    /// <summary>
    /// The internal styles
    /// </summary>
    public List<string> InternalStyles { get; set; } = new();

    /// <summary>
    /// The external styles
    /// </summary>
    public List<string> ExternalStyles { get; set; } = new();
}

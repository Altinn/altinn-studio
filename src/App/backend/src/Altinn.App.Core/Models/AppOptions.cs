namespace Altinn.App.Core.Models;

/// <summary>
/// Represents a collection of options for a dropdown selector or similar use.
/// </summary>
public class AppOptions
{
    /// <summary>
    /// Gets or sets the list of options. Null indicates that no options are found
    /// </summary>
    public List<AppOption>? Options { get; set; }

    /// <summary>
    /// Gets or sets the parameters used to generate the options.
    /// The dictionary key is the name of the parameter and the value is the value of the parameter.
    /// This can be used to document the parameters used to generate the options.
    /// </summary>
    public Dictionary<string, string?> Parameters { get; set; } = new();

    /// <summary>
    /// Gets or sets a value indicating whether the options can be cached.
    /// </summary>
    public bool IsCacheable { get; set; }
}

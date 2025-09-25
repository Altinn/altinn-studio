using Newtonsoft.Json;

namespace Altinn.App.Core.Models;

/// <summary>
/// The Logo configuration
/// </summary>
public class Logo
{
    /// <summary>
    /// A flag to specify that the form should display appOwner in header
    /// </summary>
    [JsonProperty(PropertyName = "displayAppOwnerNameInHeader")]
    public bool DisplayAppOwnerNameInHeader { get; set; }

    /// <summary>
    /// Specifies from where the logo url should be fetched
    /// </summary>
    [JsonProperty(PropertyName = "source")]
    public string? Source { get; set; }

    /// <summary>
    /// Specifies the size of the logo. Can have the values
    /// 'small', 'medium', or 'large'
    /// </summary>
    [JsonProperty(PropertyName = "size")]
    public string Size { get; set; } = "small";
}

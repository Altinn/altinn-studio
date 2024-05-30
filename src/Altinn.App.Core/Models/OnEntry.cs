using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;

namespace Altinn.App.Core.Models;

/// <summary>
/// The on entry configuration
/// </summary>
public class OnEntry : OnEntryConfig
{
    /// <summary>
    /// Options for displaying the instance selection component
    /// </summary>
    [JsonProperty(PropertyName = "instanceSelection")]
    public InstanceSelection? InstanceSelection { get; set; }
}

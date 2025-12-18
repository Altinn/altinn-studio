using System.Collections.Generic;
using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage.Models;

/// <summary>
/// Represents a simplified instance with most fields redacted, see <see cref="Instance"/>.
/// </summary>
public class SimpleInstanceDetails : SimpleInstance
{
    /// <summary>
    /// A list of simplified data elements associated with the instance
    /// </summary>
    [JsonPropertyName("data")]
    public List<SimpleDataElement>? Data { get; set; }
}

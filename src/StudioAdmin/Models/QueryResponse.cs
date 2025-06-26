using System.Text.Json.Serialization;

namespace Altinn.Studio.Admin.Models;

/// <summary>
/// Query response object
/// </summary>
public class QueryResponse<T>
{
    /// <summary>
    /// The number of items in this response.
    /// </summary>
    [JsonPropertyName("count")]
    public long Count { get; set; }

    /// <summary>
    /// The current query.
    /// </summary>
    [JsonPropertyName("self")]
#nullable disable
    public string Self { get; set; }

    /// <summary>
    /// A link to the next page.
    /// </summary>
    [JsonPropertyName("next")]
    public string Next { get; set; }

    /// <summary>
    /// The metadata.
    /// </summary>
    [JsonPropertyName("instances")]
    public List<T> Instances { get; set; }
#nullable restore
}

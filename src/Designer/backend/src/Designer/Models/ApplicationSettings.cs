#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Models;

public class ApplicationSettings
{
    /// <summary>
    /// Gets or sets the unique id of the application, e.g. test/app-34
    /// </summary>
    [JsonProperty(PropertyName = "id")]
    public string Id { get; set; }

    /// <summary>Gets or sets the application version id.</summary>
    [JsonProperty(PropertyName = "versionId")]
    public string VersionId { get; set; }

    /// <summary>
    /// Gets or sets the short code representing the owner of the service. E.g. nav
    /// </summary>
    [JsonProperty(PropertyName = "org")]
    public string Org { get; set; }

    /// <summary>
    /// Gets or sets the title of the application with language codes.
    /// </summary>
    [JsonProperty(PropertyName = "title")]
    public Dictionary<string, string> Title { get; set; }
}

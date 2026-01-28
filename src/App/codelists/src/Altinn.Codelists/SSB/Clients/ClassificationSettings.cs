namespace Altinn.Codelists.SSB.Clients;

/// <summary>
/// Options to control the behavior of <see cref="ClassificationsHttpClient"/>
/// </summary>
public class ClassificationSettings
{
    /// <summary>
    /// Base url to the api endpoint for classifications.
    /// </summary>
    public string BaseApiUrl { get; set; } = "https://data.ssb.no/api/klass/v1/classifications/";
}

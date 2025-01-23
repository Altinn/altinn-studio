using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Models;

public class DecommissionBuildParameters
{
    [JsonPropertyName("APP_OWNER")]
    public string AppOwner { get; set; }

    [JsonPropertyName("APP_REPO")]
    public string AppRepo { get; set; }

    [JsonPropertyName("APP_ENVIRONMENT")]
    public string AppEnvironment { get; set; }
}


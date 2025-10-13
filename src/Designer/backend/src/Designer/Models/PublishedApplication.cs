using System.Text.Json.Serialization;
using Altinn.Studio.Designer.TypedHttpClients.KubernetesWrapper;

namespace Altinn.Studio.Designer.Models;

public class PublishedApplication
{
    [JsonPropertyName("org")]
    public required string Org { get; set; }

    [JsonPropertyName("env")]
    public required string Env { get; set; }

    [JsonPropertyName("app")]
    public required string App { get; set; }

    [JsonPropertyName("version")]
    public required string Version { get; set; }

    public static PublishedApplication FromKubernetesDeployment(KubernetesDeployment deployment)
    {
        var splitIndex = deployment.Release.IndexOf("-");
        var org = deployment.Release.Substring(0, splitIndex);
        var app = deployment.Release.Substring(splitIndex + 1);

        return new PublishedApplication()
        {
            Org = org,
            App = app,
            Env = deployment.EnvName,
            Version = deployment.Version,
        };
    }
}

using System;
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
        var release =
            deployment.Release
            ?? throw new InvalidOperationException("Missing release for deployment.");
        int splitIndex = release.IndexOf('-', StringComparison.Ordinal);
        if (splitIndex <= 0 || splitIndex >= release.Length - 1)
        {
            throw new InvalidOperationException(
                $"Invalid release format: '{release}'. Expected 'org-app'."
            );
        }

        var org = release.Substring(0, splitIndex);
        var app = release.Substring(splitIndex + 1);

        return new PublishedApplication()
        {
            Org = org,
            App = app,
            Env = deployment.EnvName,
            Version = deployment.Version,
        };
    }
}

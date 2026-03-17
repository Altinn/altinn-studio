using System.Text.Json.Serialization;
using k8s;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Tests.Models;

/// <summary>
/// Represents a Flux HelmRepository custom resource.
/// </summary>
internal sealed class HelmRepository : IKubernetesObject<V1ObjectMeta>
{
    [JsonPropertyName("apiVersion")]
    public string ApiVersion { get; set; } = "source.toolkit.fluxcd.io/v1";

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = "HelmRepository";

    [JsonPropertyName("metadata")]
    public V1ObjectMeta Metadata { get; set; } = new();

    [JsonPropertyName("spec")]
    public HelmRepositorySpec Spec { get; set; } = new();
}

internal sealed class HelmRepositorySpec
{
    [JsonPropertyName("interval")]
    public string Interval { get; set; } = "5m";

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

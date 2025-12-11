using System.Text.Json.Serialization;
using k8s;
using k8s.Models;

namespace StudioGateway.Api.Tests.Models;

/// <summary>
/// Represents a Flux HelmRelease custom resource.
/// </summary>
internal sealed class HelmRelease : IKubernetesObject<V1ObjectMeta>
{
    [JsonPropertyName("apiVersion")]
    public string ApiVersion { get; set; } = "helm.toolkit.fluxcd.io/v2";

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = "HelmRelease";

    [JsonPropertyName("metadata")]
    public V1ObjectMeta Metadata { get; set; } = new();

    [JsonPropertyName("spec")]
    public HelmReleaseSpec Spec { get; set; } = new();
}

internal sealed class HelmReleaseSpec
{
    [JsonPropertyName("interval")]
    public string Interval { get; set; } = "5m";

    [JsonPropertyName("timeout")]
    public string? Timeout { get; set; }

    [JsonPropertyName("chart")]
    public HelmChartTemplate Chart { get; set; } = new();

    [JsonPropertyName("install")]
    public HelmReleaseInstall? Install { get; set; }
}

internal sealed class HelmReleaseInstall
{
    [JsonPropertyName("timeout")]
    public string? Timeout { get; set; }
}

internal sealed class HelmChartTemplate
{
    [JsonPropertyName("spec")]
    public HelmChartTemplateSpec Spec { get; set; } = new();
}

internal sealed class HelmChartTemplateSpec
{
    [JsonPropertyName("chart")]
    public string Chart { get; set; } = string.Empty;

    [JsonPropertyName("version")]
    public string? Version { get; set; }

    [JsonPropertyName("sourceRef")]
    public CrossNamespaceObjectReference SourceRef { get; set; } = new();
}

internal sealed class CrossNamespaceObjectReference
{
    [JsonPropertyName("kind")]
    public string Kind { get; set; } = "HelmRepository";

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("namespace")]
    public string? Namespace { get; set; }
}

[JsonSerializable(typeof(HelmRelease))]
[JsonSerializable(typeof(HelmReleaseSpec))]
[JsonSerializable(typeof(HelmReleaseInstall))]
[JsonSerializable(typeof(HelmChartTemplate))]
[JsonSerializable(typeof(HelmChartTemplateSpec))]
[JsonSerializable(typeof(CrossNamespaceObjectReference))]
internal sealed partial class TestJsonContext : JsonSerializerContext;

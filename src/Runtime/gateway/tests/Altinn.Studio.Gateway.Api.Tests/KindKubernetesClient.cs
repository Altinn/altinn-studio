using System.Text.Json.Serialization.Metadata;
using Altinn.Studio.Gateway.Api.Tests.Models;
using k8s;

namespace Altinn.Studio.Gateway.Api.Tests;

internal static class KindKubernetesClient
{
    private const string KindContextName = "kind-runtime-fixture-kind-minimal";

    static KindKubernetesClient()
    {
        // The AOT k8s client serializes through process-wide options that only know the built-in k8s models.
        // Register the test bodies (Flux CRD models, JsonObject) once, before any test creates a client,
        // so no test class depends on another class having run first.
        KubernetesJson.AddJsonOptions(options =>
        {
#pragma warning disable NX0003 // TypeInfoResolver is guaranteed to be non-null after KubernetesJson initializes options
            options.TypeInfoResolver = JsonTypeInfoResolver.Combine(TestJsonContext.Default, options.TypeInfoResolver!);
#pragma warning restore NX0003
        });
    }

    public static IKubernetes Create() =>
        new Kubernetes(KubernetesClientConfiguration.BuildConfigFromConfigFile(currentContext: KindContextName));
}

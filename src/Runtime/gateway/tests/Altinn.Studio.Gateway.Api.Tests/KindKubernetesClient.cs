using System.Runtime.CompilerServices;
using System.Text.Json.Serialization.Metadata;
using Altinn.Studio.Gateway.Api.Tests.Models;
using k8s;

namespace Altinn.Studio.Gateway.Api.Tests;

internal static class KindKubernetesClient
{
    private const string KindContextName = "kind-runtime-fixture-kind-minimal";

    // The AOT k8s client serializes through process-wide options that only know the built-in k8s models.
    // Register the test bodies (Flux CRD models, JsonObject) when the test assembly loads: the first
    // serialization by any client freezes those options, and test classes run in parallel.
    [ModuleInitializer]
    internal static void RegisterTestJsonTypes()
    {
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

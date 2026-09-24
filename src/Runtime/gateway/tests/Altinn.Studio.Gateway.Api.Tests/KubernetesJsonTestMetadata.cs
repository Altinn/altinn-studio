using System.Runtime.CompilerServices;
using System.Text.Json.Serialization.Metadata;
using Altinn.Studio.Gateway.Api.Tests.Models;
using k8s;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// Registers this assembly's JSON metadata (<see cref="TestJsonContext"/>) with the Kubernetes
/// client's process-wide serializer, once, before any test runs.
/// <para>
/// <c>KubernetesClient.Aot</c> resolves JSON metadata exclusively through its own source-generated
/// <c>k8s.SourceGenerationContext</c>, which knows nothing about the test-only Flux models or about
/// <see cref="System.Text.Json.Nodes.JsonObject"/>. Tests that send those as request bodies must add
/// <see cref="TestJsonContext"/> to the resolver chain first, or serialization fails with
/// <see cref="NotSupportedException"/>.
/// </para>
/// <para>
/// The single <c>JsonSerializerOptions</c> instance behind <see cref="KubernetesJson"/> is owned by a
/// <c>JsonSerializerContext</c>, so it becomes permanently immutable the moment the first payload is
/// (de)serialized through it. Registering from test-class constructors therefore made the suite
/// order-dependent: classes that registered nothing free-rode on a class that happened to construct
/// first, and any registration attempted after the freeze throws <see cref="InvalidOperationException"/>.
/// A module initializer runs exactly once, before any test in this assembly, so every test class sees
/// the same metadata regardless of how xUnit schedules collections.
/// </para>
/// </summary>
internal static class KubernetesJsonTestMetadata
{
    [ModuleInitializer]
    internal static void Register()
    {
        KubernetesJson.AddJsonOptions(options =>
        {
#pragma warning disable NX0003 // TypeInfoResolver is guaranteed to be non-null after KubernetesJson initializes options
            options.TypeInfoResolver = JsonTypeInfoResolver.Combine(TestJsonContext.Default, options.TypeInfoResolver!);
#pragma warning restore NX0003
        });
    }
}

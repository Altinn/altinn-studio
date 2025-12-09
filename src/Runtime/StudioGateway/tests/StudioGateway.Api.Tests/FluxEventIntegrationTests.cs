using System.Text.Json.Serialization.Metadata;
using k8s;
using k8s.Models;
using StudioGateway.Api.Tests.Models;

namespace StudioGateway.Api.Tests;

/// <summary>
/// Integration tests that verify Flux notification events are correctly delivered to the webhook endpoint.
/// These tests require a running kind cluster with notification-controller installed.
/// </summary>
[Trait("Category", "Kubernetes")]
public sealed class FluxEventIntegrationTests : IAsyncLifetime
{
    private const string KindContextName = "kind-runtime-fixture-kind-minimal";
    private const string TestNamespace = "default";

    private readonly IKubernetes _client;
    private readonly List<string> _helmReleasesToCleanup = [];

    public FluxEventIntegrationTests()
    {
        // Register our custom types with the k8s JSON serializer for AOT compatibility
        KubernetesJson.AddJsonOptions(options =>
        {
#pragma warning disable NX0003 // TypeInfoResolver is guaranteed to be non-null after KubernetesJson initializes options
            options.TypeInfoResolver = JsonTypeInfoResolver.Combine(TestJsonContext.Default, options.TypeInfoResolver!);
#pragma warning restore NX0003
        });

        var config = KubernetesClientConfiguration.BuildConfigFromConfigFile(currentContext: KindContextName);
        _client = new Kubernetes(config);
    }

    public ValueTask InitializeAsync() => ValueTask.CompletedTask;

    public async ValueTask DisposeAsync()
    {
        foreach (var name in _helmReleasesToCleanup)
        {
            try
            {
                await _client.CustomObjects.DeleteNamespacedCustomObjectAsync(
                    group: "helm.toolkit.fluxcd.io",
                    version: "v2",
                    namespaceParameter: TestNamespace,
                    plural: "helmreleases",
                    name: name
                );
            }
            catch
            {
                // Best effort cleanup
            }
        }

        _client.Dispose();
    }

    [Fact]
    public async Task FluxWebhook_WhenHelmReleaseCreated_ReceivesEvent()
    {
        var ct = TestContext.Current.CancellationToken;
        var org = "ttd";
        var appName = "app-" + Guid.NewGuid().ToString("N")[..5];
        var helmReleaseName = $"ttd-hr-{appName}-staging";
        _helmReleasesToCleanup.Add(helmReleaseName);

        // Create a HelmRelease using real metrics-server chart from flux-system HelmRepository
        var helmRelease = new HelmRelease
        {
            Metadata = new V1ObjectMeta
            {
                Name = helmReleaseName,
                NamespaceProperty = TestNamespace,
                Labels = new Dictionary<string, string>
                {
                    ["altinn.studio/managed-by"] = "altinn-studio",
                    ["altinn.studio/build-id"] = "12345",
                    ["altinn.studio/source-environment"] = "staging",
                    ["altinn.studio/org"] = org,
                    ["altinn.studio/app"] = appName,
                },
            },
            Spec = new HelmReleaseSpec
            {
                Interval = "5m",
                Timeout = "10s",
                Install = new HelmReleaseInstall { Timeout = "10s" },
                Chart = new HelmChartTemplate
                {
                    Spec = new HelmChartTemplateSpec
                    {
                        Chart = "metrics-server",
                        Version = "3.x",
                        SourceRef = new CrossNamespaceObjectReference
                        {
                            Kind = "HelmRepository",
                            Name = "metrics-server", // this is something that already exists in flux-system. It will produce a valid Fail event
                            Namespace = "flux-system",
                        },
                    },
                },
            },
        };

        await _client.CustomObjects.CreateNamespacedCustomObjectAsync(
            body: helmRelease,
            group: "helm.toolkit.fluxcd.io",
            version: "v2",
            namespaceParameter: TestNamespace,
            plural: "helmreleases",
            cancellationToken: ct
        );

        // Wait for the HelmRelease install to timeout (10s) plus buffer for notification
        await Task.Delay(TimeSpan.FromSeconds(15), ct);

        // Verify the HelmRelease was created and has a status
        var result = await _client.CustomObjects.GetNamespacedCustomObjectAsync(
            group: "helm.toolkit.fluxcd.io",
            version: "v2",
            namespaceParameter: TestNamespace,
            plural: "helmreleases",
            name: helmReleaseName,
            cancellationToken: ct
        );

        Assert.NotNull(result);

        // Check gateway pod logs for the received event
        var pods = await _client.CoreV1.ListNamespacedPodAsync(
            namespaceParameter: "runtime-gateway",
            labelSelector: "app=studio-gateway",
            cancellationToken: ct
        );

        var gatewayPod = pods.Items.FirstOrDefault();
        Assert.NotNull(gatewayPod);

        // Read logs from the gateway pod
        await using var logStream = await _client.CoreV1.ReadNamespacedPodLogAsync(
            name: gatewayPod.Metadata.Name,
            namespaceParameter: "runtime-gateway",
            container: "studio-gateway",
            sinceSeconds: 30,
            cancellationToken: ct
        );

        using var reader = new StreamReader(logStream);
        var logs = await reader.ReadToEndAsync(ct);

        // The webhook should have logged the InstallFailed event (install times out after 10s)
        Assert.Contains($"Received Flux event: InstallFailed for HelmRelease/{helmReleaseName}", logs, StringComparison.Ordinal);
    }

    [Fact]
    public async Task NotificationController_IsRunning()
    {
        var ct = TestContext.Current.CancellationToken;
        var deployment = await _client.AppsV1.ReadNamespacedDeploymentAsync(
            name: "notification-controller",
            namespaceParameter: "flux-system",
            cancellationToken: ct
        );

        Assert.NotNull(deployment);
        Assert.Equal(1, deployment.Status.ReadyReplicas);
    }

    [Fact]
    public async Task FluxAlert_IsConfigured()
    {
        var ct = TestContext.Current.CancellationToken;
        var alert = await _client.CustomObjects.GetNamespacedCustomObjectAsync(
            group: "notification.toolkit.fluxcd.io",
            version: "v1beta3",
            namespaceParameter: "flux-system",
            plural: "alerts",
            name: "helm-releases",
            cancellationToken: ct
        );

        Assert.NotNull(alert);
    }

    [Fact]
    public async Task FluxProvider_IsConfigured()
    {
        var ct = TestContext.Current.CancellationToken;
        var provider = await _client.CustomObjects.GetNamespacedCustomObjectAsync(
            group: "notification.toolkit.fluxcd.io",
            version: "v1beta3",
            namespaceParameter: "flux-system",
            plural: "providers",
            name: "generic-webhook",
            cancellationToken: ct
        );

        Assert.NotNull(provider);
    }
}

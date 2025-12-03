using k8s;

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
        var helmReleaseName = $"test-hr-{Guid.NewGuid():N}"[..40];
        _helmReleasesToCleanup.Add(helmReleaseName);

        // Create a HelmRelease with the required label to trigger Alert
        var helmRelease = new
        {
            apiVersion = "helm.toolkit.fluxcd.io/v2",
            kind = "HelmRelease",
            metadata = new
            {
                name = helmReleaseName,
                @namespace = TestNamespace,
                labels = new Dictionary<string, string> { ["altinn.studio/managed-by"] = "altinn-studio" },
            },
            spec = new
            {
                interval = "5m",
                chart = new
                {
                    spec = new
                    {
                        chart = "nonexistent-chart",
                        version = "0.0.1",
                        sourceRef = new { kind = "HelmRepository", name = "nonexistent-repo" },
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

        // Wait a bit for the notification-controller to process the event
        await Task.Delay(TimeSpan.FromSeconds(5), ct);

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

        // The webhook should have logged the received event
        Assert.Contains("Received Flux event", logs, StringComparison.Ordinal);
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

using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Altinn.Studio.Gateway.Api.Tests.Models;
using k8s;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// Integration tests that verify Flux notification events are correctly delivered to the webhook endpoint.
/// These tests require a running kind cluster with notification-controller installed.
/// </summary>
[Trait("Category", "Kubernetes")]
public sealed class FluxEventIntegrationTests : IAsyncLifetime
{
    private const string KindContextName = "kind-runtime-fixture-kind-minimal";
    private const string TestNamespace = "default";
    private static readonly TimeSpan FluxEventTimeout = TimeSpan.FromMinutes(2);
    private static readonly TimeSpan FluxEventPollInterval = TimeSpan.FromSeconds(1);

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
                    group: FluxApi.HelmReleaseGroup,
                    version: FluxApi.V2,
                    namespaceParameter: TestNamespace,
                    plural: FluxApi.HelmReleasePlural,
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
                            Namespace = FluxApi.FluxSystemNamespace,
                        },
                    },
                },
            },
        };

        await _client.CustomObjects.CreateNamespacedCustomObjectAsync(
            body: helmRelease,
            group: FluxApi.HelmReleaseGroup,
            version: FluxApi.V2,
            namespaceParameter: TestNamespace,
            plural: FluxApi.HelmReleasePlural,
            cancellationToken: ct
        );

        await WaitForHelmReleaseReasonAsync(helmReleaseName, "InstallFailed", ct);

        // The webhook should log the InstallFailed event after Flux notification-controller delivers it.
        await WaitForGatewayLogAsync($"Received Flux event: InstallFailed for HelmRelease/{helmReleaseName}", ct);
    }

    private async Task WaitForHelmReleaseReasonAsync(string helmReleaseName, string reason, CancellationToken ct)
    {
        var deadline = TimeProvider.System.GetUtcNow() + FluxEventTimeout;
        string? lastStatus = null;

        while (TimeProvider.System.GetUtcNow() < deadline)
        {
            var result = await _client.CustomObjects.GetNamespacedCustomObjectAsync(
                group: FluxApi.HelmReleaseGroup,
                version: FluxApi.V2,
                namespaceParameter: TestNamespace,
                plural: FluxApi.HelmReleasePlural,
                name: helmReleaseName,
                cancellationToken: ct
            );

            if (result is JsonElement element)
            {
                lastStatus = DescribeHelmReleaseStatus(element);
                if (HelmReleaseHasReason(element, reason))
                {
                    return;
                }
            }

            await Task.Delay(FluxEventPollInterval, ct);
        }

        throw new TimeoutException(
            $"Timed out waiting for HelmRelease/{helmReleaseName} reason {reason}. Last status: {lastStatus ?? "<none>"}"
        );
    }

    private async Task WaitForGatewayLogAsync(string expectedLogEntry, CancellationToken ct)
    {
        var deadline = TimeProvider.System.GetUtcNow() + FluxEventTimeout;
        string? lastLogs = null;

        while (TimeProvider.System.GetUtcNow() < deadline)
        {
            lastLogs = await ReadGatewayLogsAsync(ct);
            if (lastLogs.Contains(expectedLogEntry, StringComparison.Ordinal))
            {
                return;
            }

            await Task.Delay(FluxEventPollInterval, ct);
        }

        throw new TimeoutException(
            $"Timed out waiting for gateway log entry '{expectedLogEntry}'. Last logs: {lastLogs ?? "<none>"}"
        );
    }

    private async Task<string> ReadGatewayLogsAsync(CancellationToken ct)
    {
        var pods = await _client.CoreV1.ListNamespacedPodAsync(
            namespaceParameter: "runtime-gateway",
            labelSelector: "app=gateway",
            cancellationToken: ct
        );

        var gatewayPod = pods.Items.FirstOrDefault();
        Assert.NotNull(gatewayPod);

        // Read logs from the gateway pod
        await using var logStream = await _client.CoreV1.ReadNamespacedPodLogAsync(
            name: gatewayPod.Metadata.Name,
            namespaceParameter: "runtime-gateway",
            container: "gateway",
            sinceSeconds: 120,
            cancellationToken: ct
        );

        using var reader = new StreamReader(logStream);
        return await reader.ReadToEndAsync(ct);
    }

    private static bool HelmReleaseHasReason(JsonElement element, string reason)
    {
        if (
            !element.TryGetProperty("status", out var status)
            || !status.TryGetProperty("conditions", out var conditions)
            || conditions.ValueKind != JsonValueKind.Array
        )
        {
            return false;
        }

        foreach (var condition in conditions.EnumerateArray())
        {
            if (condition.TryGetProperty("reason", out var conditionReason) && conditionReason.GetString() == reason)
            {
                return true;
            }
        }

        return false;
    }

    private static string? DescribeHelmReleaseStatus(JsonElement element)
    {
        return element.TryGetProperty("status", out var status) ? status.GetRawText() : null;
    }

    [Fact]
    public async Task NotificationController_IsRunning()
    {
        var ct = TestContext.Current.CancellationToken;
        var deployment = await _client.AppsV1.ReadNamespacedDeploymentAsync(
            name: "notification-controller",
            namespaceParameter: FluxApi.FluxSystemNamespace,
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
            group: FluxApi.NotificationGroup,
            version: FluxApi.V1Beta3,
            namespaceParameter: FluxApi.FluxSystemNamespace,
            plural: FluxApi.AlertsPlural,
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
            group: FluxApi.NotificationGroup,
            version: FluxApi.V1Beta3,
            namespaceParameter: FluxApi.FluxSystemNamespace,
            plural: FluxApi.ProvidersPlural,
            name: "generic-webhook",
            cancellationToken: ct
        );

        Assert.NotNull(provider);
    }
}

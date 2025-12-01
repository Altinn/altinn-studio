using k8s;
using k8s.Models;

namespace StudioGateway.Api.Tests;

/// <summary>
/// Integration tests that verify network policies and port filtering work correctly in a Kubernetes cluster.
/// These tests require a running cluster with the studio-gateway deployed.
/// Set RUN_K8S_TESTS=true environment variable to enable.
/// </summary>
[Trait("Category", "Kubernetes")]
public sealed class KubernetesNetworkPolicyTests : IAsyncLifetime
{
    private const string InternalServiceUrl =
        "http://studio-gateway-internal.runtime-gateway.svc.cluster.local/api/v1/flux/webhook";
    private const string PublicServiceUrl =
        "http://studio-gateway.runtime-gateway.svc.cluster.local/api/v1/flux/webhook";
    private const string CurlImage = "curlimages/curl:8.11.0";
    private const string KindContextName = "kind-runtime-fixture-kind-minimal";

    private const string ValidFluxEventJson = """
        {
            "involvedObject": {
                "kind": "HelmRelease",
                "namespace": "flux-system",
                "name": "test-release",
                "uid": "00000000-0000-0000-0000-000000000000",
                "apiVersion": "helm.toolkit.fluxcd.io/v2",
                "resourceVersion": "1"
            },
            "severity": "info",
            "timestamp": "2025-01-01T00:00:00Z",
            "message": "Test event from integration test",
            "reason": "TestReason",
            "reportingController": "integration-test",
            "reportingInstance": "test-instance"
        }
        """;

    private readonly IKubernetes? _client;
    private readonly List<(string Namespace, string Name)> _podsToCleanup = [];

    public KubernetesNetworkPolicyTests()
    {
        var config = KubernetesClientConfiguration.BuildConfigFromConfigFile(currentContext: KindContextName);
        _client = new Kubernetes(config);
    }

    public ValueTask InitializeAsync() => ValueTask.CompletedTask;

    public async ValueTask DisposeAsync()
    {
        if (_client is null)
            return;

        foreach (var (ns, name) in _podsToCleanup)
        {
            try
            {
                await _client.CoreV1.DeleteNamespacedPodAsync(name, ns);
            }
            catch
            {
                // Best effort cleanup
            }
        }

        _client.Dispose();
    }

    [Fact]
    public async Task FluxWebhook_FromFluxSystemNamespace_ReturnsOk()
    {
        var result = await ExecCurlInNamespace(
            "flux-system",
            [
                "-s",
                "-o",
                "/dev/null",
                "-w",
                "%{http_code}",
                "-X",
                "POST",
                "-H",
                "Content-Type: application/json",
                "-d",
                ValidFluxEventJson,
                InternalServiceUrl,
            ],
            timeoutSeconds: 10
        );

        Assert.Equal("200", result.Output.Trim());
    }

    [Fact]
    public async Task FluxWebhook_ViaPublicService_Returns404()
    {
        // traefik namespace can reach public service (port 8081), but endpoint returns 404 due to port filtering
        var result = await ExecCurlInNamespace(
            "traefik",
            [
                "-s",
                "-o",
                "/dev/null",
                "-w",
                "%{http_code}",
                "-X",
                "POST",
                "-H",
                "Content-Type: application/json",
                "-d",
                ValidFluxEventJson,
                PublicServiceUrl,
            ],
            timeoutSeconds: 10
        );

        Assert.Equal("404", result.Output.Trim());
    }

    [Fact]
    public async Task FluxWebhook_FromTraefikNamespace_ToInternalService_IsBlocked()
    {
        // Network policy should block traefik namespace from reaching internal service (port 8080)
        var result = await ExecCurlInNamespace(
            "traefik",
            ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "5", InternalServiceUrl],
            timeoutSeconds: 10
        );

        // curl returns exit code 28 for timeout, or connection refused results in empty/error output
        Assert.True(
            result.ExitCode != 0 || result.Output.Trim() is "" or "000",
            $"Expected connection to be blocked, but got exit={result.ExitCode}, output={result.Output}"
        );
    }

    [Fact]
    public async Task FluxWebhook_FromDefaultNamespace_ToInternalService_IsBlocked()
    {
        // Network policy should block default namespace from reaching internal service
        var result = await ExecCurlInNamespace(
            "default",
            ["-s", "-o", "/dev/null", "-w", "%{http_code}", "-m", "5", InternalServiceUrl],
            timeoutSeconds: 10
        );

        Assert.True(
            result.ExitCode != 0 || result.Output.Trim() is "" or "000",
            $"Expected connection to be blocked, but got exit={result.ExitCode}, output={result.Output}"
        );
    }

    private async Task<CurlResult> ExecCurlInNamespace(string @namespace, string[] curlArgs, int timeoutSeconds)
    {
        ArgumentNullException.ThrowIfNull(_client);

        var podName = $"curl-test-{Guid.NewGuid():N}"[..40];
        _podsToCleanup.Add((@namespace, podName));

        var pod = new V1Pod
        {
            Metadata = new V1ObjectMeta { Name = podName, NamespaceProperty = @namespace },
            Spec = new V1PodSpec
            {
                RestartPolicy = "Never",
                Containers =
                [
                    new V1Container
                    {
                        Name = "curl",
                        Image = CurlImage,
                        Command = ["sleep", "300"],
                    },
                ],
            },
        };

        await _client.CoreV1.CreateNamespacedPodAsync(pod, @namespace);
        await WaitForPodReady(@namespace, podName, TimeSpan.FromSeconds(60));

        string[] command = ["curl", .. curlArgs];
        return await ExecInPod(@namespace, podName, command, TimeSpan.FromSeconds(timeoutSeconds));
    }

    private async Task WaitForPodReady(string @namespace, string podName, TimeSpan timeout)
    {
        ArgumentNullException.ThrowIfNull(_client);

        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            var pod = await _client.CoreV1.ReadNamespacedPodAsync(podName, @namespace);
            var containerStatus = pod.Status?.ContainerStatuses?.FirstOrDefault();
            if (containerStatus?.Ready == true)
                return;

            await Task.Delay(500);
        }

        throw new TimeoutException($"Pod {podName} did not become ready within {timeout}");
    }

    private async Task<CurlResult> ExecInPod(string @namespace, string podName, string[] command, TimeSpan timeout)
    {
        ArgumentNullException.ThrowIfNull(_client);

        using var cts = new CancellationTokenSource(timeout);

        try
        {
            var webSocket = await _client.WebSocketNamespacedPodExecAsync(
                podName,
                @namespace,
                command,
                "curl",
                stderr: true,
                stdin: false,
                stdout: true,
                tty: false,
                cancellationToken: cts.Token
            );

            using var demuxer = new StreamDemuxer(webSocket);
            demuxer.Start();

            await using var stdOutStream = demuxer.GetStream(ChannelIndex.StdOut, null);
            await using var stdErrStream = demuxer.GetStream(ChannelIndex.StdErr, null);

            using var stdOutReader = new StreamReader(stdOutStream);
            using var stdErrReader = new StreamReader(stdErrStream);

            var stdOut = await stdOutReader.ReadToEndAsync(cts.Token);
            var stdErr = await stdErrReader.ReadToEndAsync(cts.Token);

            return new CurlResult(0, stdOut, stdErr);
        }
        catch (OperationCanceledException)
        {
            return new CurlResult(-1, "", "Timeout");
        }
    }

    private sealed record CurlResult(int ExitCode, string Output, string Error);
}

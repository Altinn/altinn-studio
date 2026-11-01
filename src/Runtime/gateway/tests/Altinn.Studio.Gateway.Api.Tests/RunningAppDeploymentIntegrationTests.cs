using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Altinn.Studio.Gateway.Contracts.Deploy;
using Altinn.Studio.Gateway.Contracts.Workflows;
using k8s;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Tests;

[Trait("Category", "Kubernetes")]
public sealed class RunningAppDeploymentIntegrationTests : IAsyncLifetime
{
    private const string TestNamespace = "default";
    private const string Org = "ttd";

    // Its pods back off from pulling it, so they fail.
    private const string UnpullableImage = "registry.invalid/ttd/never:1";

    // Kind preloads it on every node, so its pods start and become available without a pull.
    private const string PauseImage = "registry.k8s.io/pause:3.10";
    private static readonly TimeSpan StatusTimeout = TimeSpan.FromSeconds(90);

    private readonly IKubernetes _k8sClient;
    private readonly HttpClient _httpClient;
    private readonly List<string> _deploymentsToCleanup = [];

    public RunningAppDeploymentIntegrationTests()
    {
        _k8sClient = KindKubernetesClient.Create();
        _httpClient = new HttpClient { BaseAddress = new Uri("http://localhost:8020") };
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            FakeMaskinportenTokenGenerator.GenerateValidToken()
        );
    }

    public ValueTask InitializeAsync() => ValueTask.CompletedTask;

    public async ValueTask DisposeAsync()
    {
        foreach (var name in _deploymentsToCleanup)
        {
            try
            {
                await _k8sClient.AppsV1.DeleteNamespacedDeploymentAsync(name, TestNamespace);
            }
            catch
            {
                // Best effort cleanup
            }
        }

        _k8sClient.Dispose();
        _httpClient.Dispose();
    }

    [Fact]
    public async Task GetRunning_WhenDeploymentExists_ReturnsTheStudioDeploy()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "running-" + Guid.NewGuid().ToString("N")[..5];
        await CreateDeploymentAsync(
            app,
            $"registry:5000/{Org}/{app}:9cf6fc1",
            new Dictionary<string, string>
            {
                ["altinn.studio/build-id"] = "1234",
                ["altinn.studio/source-environment"] = "prod",
                ["altinn.studio/deployment-id"] = "42",
            },
            ct: ct
        );

        var deployment = await WaitForStatus(app, RunningAppStatus.Ready, ct);

        Assert.Equal(
            new RunningAppDeployment($"{Org}-{app}", "9cf6fc1", "1234", "prod", "42", RunningAppStatus.Ready, null),
            deployment
        );
    }

    [Fact]
    public async Task GetRunning_WhileNewPodsStart_IsUpdating()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "starting-" + Guid.NewGuid().ToString("N")[..5];
        await CreateDeploymentAsync(app, PauseImage, replicas: 1, neverReady: true, ct: ct);

        await WaitForStatus(app, RunningAppStatus.Updating, ct);
    }

    [Fact]
    public async Task GetRunning_WhenNewPodsFailWhileTheOldOnesServe_IsStuck()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "stuck-" + Guid.NewGuid().ToString("N")[..5];
        await CreateDeploymentAsync(app, PauseImage, replicas: 1, ct: ct);
        await WaitForStatus(app, RunningAppStatus.Ready, ct);

        await SetImage(app, UnpullableImage, ct);

        await WaitForStatus(app, RunningAppStatus.Stuck, ct);
    }

    [Fact]
    public async Task GetRunning_WhenNoPodCanStart_IsUnavailable()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "failing-" + Guid.NewGuid().ToString("N")[..5];
        await CreateDeploymentAsync(app, UnpullableImage, replicas: 1, ct: ct);

        await WaitForStatus(app, RunningAppStatus.Unavailable, ct);
    }

    [Fact]
    public async Task GetRunning_WhenNoDeployment_ReturnsNotFound()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "missing-" + Guid.NewGuid().ToString("N")[..5];

        var response = await _httpClient.GetAsync(RunningUri(app), ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetRunning_WhenAppNameWidensTheSelector_ReturnsBadRequest()
    {
        var ct = TestContext.Current.CancellationToken;

        var response = await _httpClient.GetAsync(RunningUri("my-app,release!=x"), ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Restart_WhenReady_ReplacesThePods()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "restart-" + Guid.NewGuid().ToString("N")[..5];
        await CreateDeploymentAsync(app, PauseImage, replicas: 1, ct: ct);
        await WaitForStatus(app, RunningAppStatus.Ready, ct);
        var podsBefore = await PodUids(app, ct);

        var response = await _httpClient.PostAsync(RestartUri(app), content: null, ct);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var accepted = await response.Content.ReadFromJsonAsync<RunningAppDeployment>(ct);
        Assert.NotNull(accepted);
        Assert.Equal(RunningAppStatus.Updating, accepted.Status);
        Assert.NotNull(accepted.RestartedAt);
        Assert.Equal(FormatRestartedAt(accepted.RestartedAt.Value), await RestartedAtAnnotation(app, ct));

        var running = await WaitForStatus(app, RunningAppStatus.Ready, ct);
        Assert.Equal(accepted.RestartedAt, running.RestartedAt);
        var podsAfter = await PodUids(app, ct);
        Assert.NotEmpty(podsAfter);
        Assert.Empty(podsAfter.Intersect(podsBefore));
    }

    [Fact]
    public async Task Restart_WhenRequestedTwiceAtOnce_RestartsOnce()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "twice-" + Guid.NewGuid().ToString("N")[..5];
        await CreateDeploymentAsync(app, PauseImage, replicas: 1, ct: ct);
        await WaitForStatus(app, RunningAppStatus.Ready, ct);

        var responses = await Task.WhenAll(
            Enumerable.Range(0, 5).Select(_ => _httpClient.PostAsync(RestartUri(app), content: null, ct))
        );

        Assert.Equal(
            [
                HttpStatusCode.Accepted,
                HttpStatusCode.Conflict,
                HttpStatusCode.Conflict,
                HttpStatusCode.Conflict,
                HttpStatusCode.Conflict,
            ],
            responses.Select(response => response.StatusCode).Order()
        );
    }

    [Fact]
    public async Task Restart_WhileUpdating_ReturnsConflict()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "updating-" + Guid.NewGuid().ToString("N")[..5];
        await CreateDeploymentAsync(app, PauseImage, replicas: 1, neverReady: true, ct: ct);
        await WaitForStatus(app, RunningAppStatus.Updating, ct);

        var response = await _httpClient.PostAsync(RestartUri(app), content: null, ct);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<GatewayProblem>(ct);
        Assert.Equal(GatewayProblem.AppUpdatingType, problem?.Type);
    }

    [Fact]
    public async Task Restart_WhenStuck_StampsThePodTemplate()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "restuck-" + Guid.NewGuid().ToString("N")[..5];
        await CreateDeploymentAsync(app, PauseImage, replicas: 1, ct: ct);
        await WaitForStatus(app, RunningAppStatus.Ready, ct);
        await SetImage(app, UnpullableImage, ct);
        await WaitForStatus(app, RunningAppStatus.Stuck, ct);

        var response = await _httpClient.PostAsync(RestartUri(app), content: null, ct);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var accepted = await response.Content.ReadFromJsonAsync<RunningAppDeployment>(ct);
        Assert.NotNull(accepted?.RestartedAt);
        Assert.Equal(RunningAppStatus.Updating, accepted.Status);
        Assert.Equal(FormatRestartedAt(accepted.RestartedAt.Value), await RestartedAtAnnotation(app, ct));
    }

    [Fact]
    public async Task Restart_WhenPaused_ReturnsConflict()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "paused-" + Guid.NewGuid().ToString("N")[..5];
        await CreateDeploymentAsync(app, PauseImage, paused: true, ct: ct);
        await WaitForStatus(app, RunningAppStatus.Ready, ct);

        var response = await _httpClient.PostAsync(RestartUri(app), content: null, ct);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<GatewayProblem>(ct);
        Assert.Equal(GatewayProblem.AppPausedType, problem?.Type);
        Assert.Null(await RestartedAtAnnotation(app, ct));
    }

    [Fact]
    public async Task Restart_WhenNoDeployment_ReturnsNotFound()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "missing-" + Guid.NewGuid().ToString("N")[..5];

        var response = await _httpClient.PostAsync(RestartUri(app), content: null, ct);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Restart_WhenAppNameWidensTheSelector_ReturnsBadRequest()
    {
        var ct = TestContext.Current.CancellationToken;

        var response = await _httpClient.PostAsync(RestartUri("my-app,release!=x"), content: null, ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<RunningAppDeployment> WaitForStatus(string app, RunningAppStatus status, CancellationToken ct)
    {
        var deadline = DateTimeOffset.UtcNow + StatusTimeout;
        RunningAppDeployment? deployment = null;
        while (DateTimeOffset.UtcNow < deadline)
        {
            using var response = await _httpClient.GetAsync(RunningUri(app), ct);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            deployment = await response.Content.ReadFromJsonAsync<RunningAppDeployment>(ct);
            if (deployment?.Status == status)
            {
                return deployment;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(500), ct);
        }

        Assert.Fail($"{app} was still {deployment?.Status} after {StatusTimeout}, not {status}.");
        return deployment;
    }

    private async Task SetImage(string app, string image, CancellationToken ct) =>
        await _k8sClient.AppsV1.PatchNamespacedDeploymentAsync(
            new V1Patch(
                $$"""[{"op":"replace","path":"/spec/template/spec/containers/0/image","value":"{{image}}"}]""",
                V1Patch.PatchType.JsonPatch
            ),
            DeploymentName(app),
            TestNamespace,
            cancellationToken: ct
        );

    private async Task<string?> RestartedAtAnnotation(string app, CancellationToken ct)
    {
        var deployment = await _k8sClient.AppsV1.ReadNamespacedDeploymentAsync(
            DeploymentName(app),
            TestNamespace,
            cancellationToken: ct
        );
        return
            deployment.Spec.Template.Metadata.Annotations?.TryGetValue("altinn.studio/restarted-at", out var value)
            == true
            ? value
            : null;
    }

    // Pods that are terminating belong to the rollout that just finished, not to what runs.
    private async Task<HashSet<string>> PodUids(string app, CancellationToken ct)
    {
        var pods = await _k8sClient.CoreV1.ListNamespacedPodAsync(
            TestNamespace,
            labelSelector: $"release={Org}-{app}",
            cancellationToken: ct
        );
        return pods
            .Items.Where(pod => pod.Metadata.DeletionTimestamp is null)
            .Select(pod => pod.Metadata.Uid)
            .ToHashSet();
    }

    private static string FormatRestartedAt(DateTimeOffset restartedAt) =>
        restartedAt.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ", CultureInfo.InvariantCulture);

    private static Uri RestartUri(string app) =>
        new($"/runtime/gateway/api/v1/deploy/apps/{Uri.EscapeDataString(app)}/restart", UriKind.Relative);

    private static string DeploymentName(string app) => $"{Org}-{app}-deployment-v2";

    private static Uri RunningUri(string app) =>
        new($"/runtime/gateway/api/v1/deploy/apps/{Uri.EscapeDataString(app)}/running", UriKind.Relative);

    private async Task CreateDeploymentAsync(
        string app,
        string image,
        Dictionary<string, string>? annotations = null,
        int replicas = 0,
        bool neverReady = false,
        bool paused = false,
        CancellationToken ct = default
    )
    {
        var name = DeploymentName(app);
        _deploymentsToCleanup.Add(name);
        var labels = new Dictionary<string, string> { ["release"] = $"{Org}-{app}" };

        // Without replicas, the cluster never pulls the image, and the Deployment is ready once the controller has
        // seen it.
        await _k8sClient.AppsV1.CreateNamespacedDeploymentAsync(
            new V1Deployment
            {
                Metadata = new V1ObjectMeta { Name = name, Labels = labels },
                Spec = new V1DeploymentSpec
                {
                    Replicas = replicas,
                    Paused = paused,
                    Selector = new V1LabelSelector { MatchLabels = labels },
                    Template = new V1PodTemplateSpec
                    {
                        Metadata = new V1ObjectMeta { Labels = labels, Annotations = annotations },
                        Spec = new V1PodSpec
                        {
                            Containers =
                            [
                                new V1Container
                                {
                                    Name = app,
                                    Image = image,
                                    // Nothing listens, so the pod runs without becoming ready, as an app that starts.
                                    ReadinessProbe = neverReady
                                        ? new V1Probe
                                        {
                                            TcpSocket = new V1TCPSocketAction { Port = 1 },
                                            PeriodSeconds = 1,
                                        }
                                        : null,
                                },
                            ],
                        },
                    },
                },
            },
            TestNamespace,
            cancellationToken: ct
        );
    }
}

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Altinn.Studio.Gateway.Contracts.Deploy;
using k8s;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Tests;

[Trait("Category", "Kubernetes")]
public sealed class RunningAppDeploymentIntegrationTests : IAsyncLifetime
{
    private const string TestNamespace = "default";
    private const string Org = "ttd";

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
    public async Task GetRunning_WhenDeploymentExists_ReturnsReleaseAndImageTag()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = "running-" + Guid.NewGuid().ToString("N")[..5];
        await CreateDeploymentAsync(app, $"registry:5000/{Org}/{app}:9cf6fc1", ct);

        var response = await _httpClient.GetAsync(RunningUri(app), ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var deployment = await response.Content.ReadFromJsonAsync<RunningAppDeployment>(ct);
        Assert.Equal(new RunningAppDeployment($"{Org}-{app}", "9cf6fc1"), deployment);
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

    private static Uri RunningUri(string app) =>
        new($"/runtime/gateway/api/v1/deploy/apps/{Uri.EscapeDataString(app)}/running", UriKind.Relative);

    private async Task CreateDeploymentAsync(string app, string image, CancellationToken ct)
    {
        var name = $"{Org}-{app}-deployment-v2";
        _deploymentsToCleanup.Add(name);
        var labels = new Dictionary<string, string> { ["release"] = $"{Org}-{app}" };

        // No replicas, so the cluster never pulls the image.
        await _k8sClient.AppsV1.CreateNamespacedDeploymentAsync(
            new V1Deployment
            {
                Metadata = new V1ObjectMeta { Name = name, Labels = labels },
                Spec = new V1DeploymentSpec
                {
                    Replicas = 0,
                    Selector = new V1LabelSelector { MatchLabels = labels },
                    Template = new V1PodTemplateSpec
                    {
                        Metadata = new V1ObjectMeta { Labels = labels },
                        Spec = new V1PodSpec { Containers = [new V1Container { Name = app, Image = image }] },
                    },
                },
            },
            TestNamespace,
            cancellationToken: ct
        );
    }
}

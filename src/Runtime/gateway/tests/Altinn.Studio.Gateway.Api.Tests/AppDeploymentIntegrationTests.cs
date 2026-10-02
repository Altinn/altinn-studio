using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization.Metadata;
using Altinn.Studio.Gateway.Api.Tests.Models;
using Altinn.Studio.Gateway.Contracts.Deploy;
using k8s;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Tests;

[Trait("Category", "Kubernetes")]
public sealed class AppDeploymentIntegrationTests : IAsyncLifetime
{
    private const string KindContextName = "kind-runtime-fixture-kind-minimal";
    private const string TestNamespace = "default";
    private const string Org = "ttd";
    private const string OriginEnvironment = "staging";
    private const string TargetEnvironment = "local";

    private readonly IKubernetes _k8sClient;
    private readonly HttpClient _httpClient;
    private readonly List<string> _deploymentsToCleanup = [];
    private readonly List<string> _helmReleasesToCleanup = [];

    public AppDeploymentIntegrationTests()
    {
        KubernetesJson.AddJsonOptions(options =>
        {
#pragma warning disable NX0003
            options.TypeInfoResolver = JsonTypeInfoResolver.Combine(TestJsonContext.Default, options.TypeInfoResolver!);
#pragma warning restore NX0003
        });

        var config = KubernetesClientConfiguration.BuildConfigFromConfigFile(currentContext: KindContextName);
        _k8sClient = new Kubernetes(config);
        _httpClient = new HttpClient { BaseAddress = new Uri("http://localhost:8020") };
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            FakeMaskinportenTokenGenerator.GenerateValidToken()
        );
    }

    public ValueTask InitializeAsync() => ValueTask.CompletedTask;

    public async ValueTask DisposeAsync()
    {
        foreach (var name in _helmReleasesToCleanup)
        {
            await DeleteHelmReleaseSafeAsync(name);
        }

        foreach (var name in _deploymentsToCleanup)
        {
            await DeleteDeploymentSafeAsync(name);
        }

        _k8sClient.Dispose();
        _httpClient.Dispose();
    }

    [Fact]
    public async Task GetAppDeployment_WhenDeploymentIsNotGitOpsManaged_RequiresExplicitOptIn()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = CreateAppName();
        const string imageTag = "1.2.3";
        await CreateDeploymentAsync(app, imageTag, ct);

        using var defaultResponse = await _httpClient.GetAsync(GetAppDeploymentUri(app), ct);
        Assert.Equal(HttpStatusCode.NotFound, defaultResponse.StatusCode);

        using var optInResponse = await _httpClient.GetAsync(GetAppDeploymentUri(app, includeNonGitOps: true), ct);
        Assert.Equal(HttpStatusCode.OK, optInResponse.StatusCode);

        var deployment = await optInResponse.Content.ReadFromJsonAsync<AppDeployment>(cancellationToken: ct);
        Assert.NotNull(deployment);
        Assert.Equal(Org, deployment.Org);
        Assert.Equal(TargetEnvironment, deployment.Env);
        Assert.Equal(app, deployment.App);
        Assert.Null(deployment.SourceEnvironment);
        Assert.Null(deployment.BuildId);
        Assert.Equal(imageTag, deployment.ImageTag);
        Assert.Null(deployment.CurrentVersion);
        Assert.True(deployment.UpdateInProgress);
        Assert.False(deployment.IsGitOpsManaged);
    }

    [Fact]
    public async Task GetAndListAppDeployments_WhenGitOpsMetadataExists_ReturnEnrichedDeploymentByDefault()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = CreateAppName();
        const string buildId = "12345";
        const string imageTag = "2.3.4";

        await CreateDeploymentAsync(app, imageTag, ct);
        await CreateHelmReleaseAsync(app, buildId, ct);

        using var getResponse = await _httpClient.GetAsync(GetAppDeploymentUri(app), ct);
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var deployment = await getResponse.Content.ReadFromJsonAsync<AppDeployment>(cancellationToken: ct);
        Assert.NotNull(deployment);
        Assert.Equal(Org, deployment.Org);
        Assert.Equal(TargetEnvironment, deployment.Env);
        Assert.Equal(app, deployment.App);
        Assert.Equal(OriginEnvironment, deployment.SourceEnvironment);
        Assert.Equal(buildId, deployment.BuildId);
        Assert.Equal(imageTag, deployment.ImageTag);
        Assert.True(deployment.IsGitOpsManaged);

        using var listResponse = await _httpClient.GetAsync(ListAppDeploymentsUri(), ct);
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        var deployments = await listResponse.Content.ReadFromJsonAsync<List<AppDeployment>>(cancellationToken: ct);
        Assert.NotNull(deployments);
        var listedDeployment = Assert.Single(deployments, item => item.App == app);
        Assert.Equal(buildId, listedDeployment.BuildId);
        Assert.True(listedDeployment.IsGitOpsManaged);
    }

    [Fact]
    public async Task ListAppDeployments_WithExplicitOptIn_IncludesOnlyCanonicalRuntimeDeployments()
    {
        var ct = TestContext.Current.CancellationToken;
        var app = CreateAppName();
        var nonCanonicalNameApp = CreateAppName();
        var mismatchedLabelApp = CreateAppName();

        await CreateDeploymentAsync(app, "3.4.5", ct);
        await CreateDeploymentAsync(
            nonCanonicalNameApp,
            "4.5.6",
            ct,
            deploymentName: $"{Org}-{nonCanonicalNameApp}-copy"
        );
        await CreateDeploymentAsync(mismatchedLabelApp, "5.6.7", ct, release: $"{Org}-{CreateAppName()}");

        using var defaultResponse = await _httpClient.GetAsync(ListAppDeploymentsUri(), ct);
        Assert.Equal(HttpStatusCode.OK, defaultResponse.StatusCode);
        var defaultDeployments = await defaultResponse.Content.ReadFromJsonAsync<List<AppDeployment>>(
            cancellationToken: ct
        );
        Assert.NotNull(defaultDeployments);
        Assert.DoesNotContain(defaultDeployments, item => item.App == app);

        using var optInResponse = await _httpClient.GetAsync(ListAppDeploymentsUri(includeNonGitOps: true), ct);
        Assert.Equal(HttpStatusCode.OK, optInResponse.StatusCode);

        var deployments = await optInResponse.Content.ReadFromJsonAsync<List<AppDeployment>>(cancellationToken: ct);
        Assert.NotNull(deployments);
        var deployment = Assert.Single(deployments, item => item.App == app);
        Assert.Equal("3.4.5", deployment.ImageTag);
        Assert.DoesNotContain(deployments, item => item.App == nonCanonicalNameApp);
        Assert.DoesNotContain(deployments, item => item.App == mismatchedLabelApp);
    }

    [Fact]
    public async Task GetAppDeployment_WhenRuntimeDeploymentDoesNotExist_ReturnsNotFound()
    {
        var ct = TestContext.Current.CancellationToken;

        using var response = await _httpClient.GetAsync(
            GetAppDeploymentUri(CreateAppName(), includeNonGitOps: true),
            ct
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private async Task CreateDeploymentAsync(
        string app,
        string imageTag,
        CancellationToken ct,
        string? deploymentName = null,
        string? release = null
    )
    {
        deploymentName ??= $"{Org}-{app}-deployment-v2";
        release ??= $"{Org}-{app}";
        _deploymentsToCleanup.Add(deploymentName);

        var podLabel = $"{deploymentName}-pod";
        var deployment = new V1Deployment
        {
            Metadata = new V1ObjectMeta
            {
                Name = deploymentName,
                NamespaceProperty = TestNamespace,
                Labels = new Dictionary<string, string> { ["release"] = release },
            },
            Spec = new V1DeploymentSpec
            {
                Replicas = 1,
                Selector = new V1LabelSelector { MatchLabels = new Dictionary<string, string> { ["app"] = podLabel } },
                Template = new V1PodTemplateSpec
                {
                    Metadata = new V1ObjectMeta { Labels = new Dictionary<string, string> { ["app"] = podLabel } },
                    Spec = new V1PodSpec
                    {
                        Containers =
                        [
                            new V1Container
                            {
                                Name = "app",
                                Image = $"registry.example:5000/{Org}-{app}:{imageTag}@sha256:{new string('a', 64)}",
                            },
                        ],
                    },
                },
            },
        };

        await _k8sClient.AppsV1.CreateNamespacedDeploymentAsync(deployment, TestNamespace, cancellationToken: ct);
    }

    private async Task CreateHelmReleaseAsync(string app, string buildId, CancellationToken ct)
    {
        var helmReleaseName = $"{Org}-{app}-{OriginEnvironment}";
        _helmReleasesToCleanup.Add(helmReleaseName);

        var helmRelease = new HelmRelease
        {
            Metadata = new V1ObjectMeta
            {
                Name = helmReleaseName,
                NamespaceProperty = TestNamespace,
                Labels = new Dictionary<string, string>
                {
                    ["altinn.studio/managed-by"] = "altinn-studio",
                    ["altinn.studio/build-id"] = buildId,
                    ["altinn.studio/source-environment"] = OriginEnvironment,
                    ["altinn.studio/org"] = Org,
                    ["altinn.studio/app"] = app,
                },
            },
            Spec = new HelmReleaseSpec
            {
                Chart = new HelmChartTemplate
                {
                    Spec = new HelmChartTemplateSpec
                    {
                        Chart = "not-used",
                        SourceRef = new CrossNamespaceObjectReference
                        {
                            Kind = "HelmRepository",
                            Name = "not-used",
                            Namespace = FluxApi.FluxSystemNamespace,
                        },
                    },
                },
            },
        };

        await _k8sClient.CustomObjects.CreateNamespacedCustomObjectAsync(
            body: helmRelease,
            group: FluxApi.HelmReleaseGroup,
            version: FluxApi.V2,
            namespaceParameter: TestNamespace,
            plural: FluxApi.HelmReleasePlural,
            cancellationToken: ct
        );
    }

    private async Task DeleteDeploymentSafeAsync(string name)
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

    private async Task DeleteHelmReleaseSafeAsync(string name)
    {
        try
        {
            await _k8sClient.CustomObjects.DeleteNamespacedCustomObjectAsync(
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

    private static string CreateAppName() => $"deployment-test-{Guid.NewGuid():N}"[..32];

    private static Uri GetAppDeploymentUri(string app, bool includeNonGitOps = false)
    {
        var query = includeNonGitOps ? "?includeNonGitOps=true" : string.Empty;
        return new Uri($"/runtime/gateway/api/v1/deploy/apps/{app}/{OriginEnvironment}{query}", UriKind.Relative);
    }

    private static Uri ListAppDeploymentsUri(bool includeNonGitOps = false)
    {
        var query = includeNonGitOps ? "?includeNonGitOps=true" : string.Empty;
        return new Uri($"/runtime/gateway/api/v1/deploy/origin/{OriginEnvironment}/apps/{query}", UriKind.Relative);
    }
}

using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Altinn.Studio.Gateway.Api.Tests.Models;
using k8s;
using k8s.Models;

namespace Altinn.Studio.Gateway.Api.Tests;

[Trait("Category", "Kubernetes")]
public sealed class IsAppDeployedIntegrationTests : IAsyncLifetime
{
    private const string KindContextName = "kind-runtime-fixture-kind-minimal";
    private const string TestNamespace = "default";
    private const string PodInfoRepoName = "podinfo-test";
    private const string PodInfoRepoUrl = "https://stefanprodan.github.io/podinfo";

    private readonly IKubernetes _k8sClient;
    private readonly HttpClient _httpClient;
    private readonly List<string> _helmReleasesToCleanup = [];
    private bool _helmRepoCreated;

    public IsAppDeployedIntegrationTests()
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
    }

    public async ValueTask InitializeAsync()
    {
        await EnsureHelmRepositoryExistsAsync();
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var name in _helmReleasesToCleanup)
        {
            await DeleteCustomObjectSafeAsync(
                FluxApi.HelmReleaseGroup,
                FluxApi.V2,
                TestNamespace,
                FluxApi.HelmReleasePlural,
                name
            );
        }

        if (_helmRepoCreated)
        {
            await DeleteCustomObjectSafeAsync(
                FluxApi.HelmRepoGroup,
                FluxApi.V1,
                FluxApi.FluxSystemNamespace,
                FluxApi.HelmRepoPlural,
                PodInfoRepoName
            );
        }

        _k8sClient.Dispose();
        _httpClient.Dispose();
    }

    [Fact]
    public async Task IsAppDeployed_WhenHelmReleaseExists_ReturnsTrue()
    {
        var ct = TestContext.Current.CancellationToken;
        var org = "ttd";
        var appName = "podinfo-" + Guid.NewGuid().ToString("N")[..5];
        var originEnvironment = "staging";
        var helmReleaseName = $"{org}-{appName}-{originEnvironment}";

        await CreateHelmReleaseAsync(helmReleaseName, org, appName, originEnvironment, ct);

        var token = FakeMaskinportenTokenGenerator.GenerateValidToken();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _httpClient.GetAsync(
            new Uri($"/runtime/gateway/api/v1/deploy/apps/{appName}/{originEnvironment}/deployed", UriKind.Relative),
            ct
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadAsStringAsync(ct);
        using var json = JsonDocument.Parse(content);
        var isDeployed = json.RootElement.GetProperty("isDeployed").GetBoolean();

        Assert.True(isDeployed, "Expected isDeployed to be true when HelmRelease exists");
    }

    private async Task EnsureHelmRepositoryExistsAsync()
    {
        var helmRepo = new HelmRepository
        {
            Metadata = new V1ObjectMeta { Name = PodInfoRepoName, NamespaceProperty = FluxApi.FluxSystemNamespace },
            Spec = new HelmRepositorySpec { Interval = "5m", Url = PodInfoRepoUrl },
        };

        try
        {
            await _k8sClient.CustomObjects.CreateNamespacedCustomObjectAsync(
                body: helmRepo,
                group: FluxApi.HelmRepoGroup,
                version: FluxApi.V1,
                namespaceParameter: FluxApi.FluxSystemNamespace,
                plural: FluxApi.HelmRepoPlural
            );
            _helmRepoCreated = true;
        }
        catch (k8s.Autorest.HttpOperationException ex) when (ex.Response.StatusCode == HttpStatusCode.Conflict)
        {
            _helmRepoCreated = false;
        }

        await WaitForHelmRepositoryReadyAsync(PodInfoRepoName, TimeSpan.FromSeconds(30));
    }

    private async Task CreateHelmReleaseAsync(
        string helmReleaseName,
        string org,
        string appName,
        string originEnvironment,
        CancellationToken ct
    )
    {
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
                    ["altinn.studio/build-id"] = "12345",
                    ["altinn.studio/source-environment"] = originEnvironment,
                    ["altinn.studio/org"] = org,
                    ["altinn.studio/app"] = appName,
                },
            },
            Spec = new HelmReleaseSpec
            {
                Interval = "5m",
                Chart = new HelmChartTemplate
                {
                    Spec = new HelmChartTemplateSpec
                    {
                        Chart = "podinfo",
                        Version = "6.x",
                        SourceRef = new CrossNamespaceObjectReference
                        {
                            Kind = "HelmRepository",
                            Name = PodInfoRepoName,
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

    private async Task WaitForHelmRepositoryReadyAsync(string name, TimeSpan timeout)
    {
        using var cts = new CancellationTokenSource(timeout);

        while (!cts.Token.IsCancellationRequested)
        {
            try
            {
                var result = await _k8sClient.CustomObjects.GetNamespacedCustomObjectAsync(
                    group: FluxApi.HelmRepoGroup,
                    version: FluxApi.V1,
                    namespaceParameter: FluxApi.FluxSystemNamespace,
                    plural: FluxApi.HelmRepoPlural,
                    name: name,
                    cancellationToken: cts.Token
                );

                if (
                    result is JsonElement element
                    && element.TryGetProperty("status", out var status)
                    && status.TryGetProperty("conditions", out var conditions)
                )
                {
                    foreach (var condition in conditions.EnumerateArray())
                    {
                        if (
                            condition.GetProperty("type").GetString() == "Ready"
                            && condition.GetProperty("status").GetString() == "True"
                        )
                        {
                            return;
                        }
                    }
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch
            {
                // Not ready yet
            }

            await Task.Delay(500, cts.Token);
        }

        throw new TimeoutException($"HelmRepository {name} did not become ready within {timeout}");
    }

    private async Task DeleteCustomObjectSafeAsync(string group, string version, string ns, string plural, string name)
    {
        try
        {
            await _k8sClient.CustomObjects.DeleteNamespacedCustomObjectAsync(
                group: group,
                version: version,
                namespaceParameter: ns,
                plural: plural,
                name: name
            );
        }
        catch
        {
            // Best effort cleanup
        }
    }
}

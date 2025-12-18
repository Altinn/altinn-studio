using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using k8s;
using StudioGateway.Contracts.Deploy;

namespace StudioGateway.Api.Tests;

[Trait("Category", "Kubernetes")]
public sealed class TriggerReconcileIntegrationTests : IAsyncLifetime
{
    private const string KindContextName = "kind-runtime-fixture-kind-minimal";
    private const string TestNamespace = "default";
    private const string TestAppName = "test-app";
    private const string SyncrootName = "apps-syncroot-repo";

    private readonly IKubernetes _k8sClient;
    private readonly HttpClient _httpClient;

    public TriggerReconcileIntegrationTests()
    {
        var config = KubernetesClientConfiguration.BuildConfigFromConfigFile(currentContext: KindContextName);
        _k8sClient = new Kubernetes(config);
        _httpClient = new HttpClient { BaseAddress = new Uri("http://localhost:8020") };
    }

    public ValueTask InitializeAsync() => ValueTask.CompletedTask;

    public ValueTask DisposeAsync()
    {
        _k8sClient.Dispose();
        _httpClient.Dispose();
        return ValueTask.CompletedTask;
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task TriggerReconcile_ExistingApp_TriggersAppOciRepoReconciliation(bool isUndeploy)
    {
        var ct = TestContext.Current.CancellationToken;
        var originEnvironment = "local";

        var token = FakeMaskinportenTokenGenerator.GenerateValidToken();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var initialAppAnnotation = await GetOciRepoAnnotationAsync(TestAppName, ct);
        var initialSyncrootAnnotation = await GetOciRepoAnnotationAsync(SyncrootName, ct);

        var request = new TriggerReconcileRequest(IsNewApp: false, IsUndeploy: isUndeploy);
        var response = await _httpClient.PostAsJsonAsync(
            $"/runtime/gateway/api/v1/deploy/apps/{TestAppName}/{originEnvironment}/reconcile",
            request,
            ct
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        if (isUndeploy)
        {
            var newSyncrootAnnotation = await GetOciRepoAnnotationAsync(SyncrootName, ct);
            Assert.NotNull(newSyncrootAnnotation);
            Assert.NotEqual(initialSyncrootAnnotation, newSyncrootAnnotation);
            Assert.Matches(FluxApi.TimestampPattern(), newSyncrootAnnotation);
        }
        else
        {
            var newAppAnnotation = await GetOciRepoAnnotationAsync(TestAppName, ct);
            Assert.NotNull(newAppAnnotation);
            Assert.NotEqual(initialAppAnnotation, newAppAnnotation);
            Assert.Matches(FluxApi.TimestampPattern(), newAppAnnotation);
        }
    }

    [Fact]
    public async Task TriggerReconcile_TimestampFormat_IsRfc3339Nano()
    {
        var ct = TestContext.Current.CancellationToken;
        var originEnvironment = "local";

        var token = FakeMaskinportenTokenGenerator.GenerateValidToken();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new TriggerReconcileRequest(IsNewApp: false, IsUndeploy: false);
        var response = await _httpClient.PostAsJsonAsync(
            $"/runtime/gateway/api/v1/deploy/apps/{TestAppName}/{originEnvironment}/reconcile",
            request,
            ct
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var annotation = await GetOciRepoAnnotationAsync(TestAppName, ct);
        Assert.NotNull(annotation);

        Assert.Matches(FluxApi.TimestampPattern(), annotation);

        Assert.EndsWith("Z", annotation, StringComparison.Ordinal);
    }

    private async Task<string?> GetOciRepoAnnotationAsync(string name, CancellationToken ct)
    {
        try
        {
            var result = await _k8sClient.CustomObjects.GetNamespacedCustomObjectAsync(
                group: FluxApi.OciRepoGroup,
                version: FluxApi.V1,
                namespaceParameter: TestNamespace,
                plural: FluxApi.OciRepoPlural,
                name: name,
                cancellationToken: ct
            );

            if (
                result is JsonElement element
                && element.TryGetProperty("metadata", out var metadata)
                && metadata.TryGetProperty("annotations", out var annotations)
                && annotations.TryGetProperty("reconcile.fluxcd.io/requestedAt", out var annotation)
            )
            {
                return annotation.GetString();
            }
        }
        catch
        {
            // OCIRepository might not exist
        }

        return null;
    }
}

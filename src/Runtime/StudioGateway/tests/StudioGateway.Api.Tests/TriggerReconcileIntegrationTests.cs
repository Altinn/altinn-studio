using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using k8s;
using StudioGateway.Contracts.Deploy;

namespace StudioGateway.Api.Tests;

[Trait("Category", "Kubernetes")]
public sealed class TriggerReconcileIntegrationTests : IAsyncLifetime
{
    private const string KindContextName = "kind-runtime-fixture-kind-minimal";
    private const string TestNamespace = "default";
    private const string TestAppName = "test-app";
    private const string SyncrootOciRepoName = "apps-syncroot-repo";
    private const string SyncrootKustomizationName = "syncroot-apps-kustomization";
    private const string ReconcileAnnotation = "reconcile.fluxcd.io/requestedAt";

    private readonly IKubernetes _k8sClient;
    private readonly HttpClient _httpClient;

    public TriggerReconcileIntegrationTests()
    {
        var config = KubernetesClientConfiguration.BuildConfigFromConfigFile(currentContext: KindContextName);
        _k8sClient = new Kubernetes(config);
        _httpClient = new HttpClient { BaseAddress = new Uri("http://localhost:8020") };
    }

    private JsonObject? TestAppOciRepo = null;
    private JsonObject? TestAppKustomization = null;

    public async ValueTask InitializeAsync()
    {
        var testAppOciRepoObj = await _k8sClient.CustomObjects.GetNamespacedCustomObjectAsync(
            group: FluxApi.OciRepoGroup,
            version: FluxApi.V1,
            namespaceParameter: TestNamespace,
            plural: FluxApi.OciRepoPlural,
            name: TestAppName
        );
        var testAppKustomizationObj = await _k8sClient.CustomObjects.GetNamespacedCustomObjectAsync(
            group: FluxApi.KustomizationGroup,
            version: FluxApi.V1,
            namespaceParameter: TestNamespace,
            plural: FluxApi.KustomizationPlural,
            name: TestAppName
        );
        TestAppOciRepo = CleanCustomObj(testAppOciRepoObj);
        TestAppKustomization = CleanCustomObj(testAppKustomizationObj);
    }

    private JsonObject CleanCustomObj(object customObject)
    {
        if (customObject is not JsonElement element)
        {
            throw new InvalidOperationException();
        }
        var node = JsonNode.Parse(element.GetRawText());
        if (node is not JsonObject obj)
        {
            throw new InvalidOperationException();
        }
        if (obj.TryGetPropertyValue("metadata", out var metadataNode) && metadataNode is JsonObject metadataObj)
        {
            metadataObj.Remove("resourceVersion");
            metadataObj.Remove("uid");
            metadataObj.Remove("selfLink");
        }

        return obj;
    }

    private async Task DeleteTestApp()
    {
        try
        {
            await _k8sClient.CustomObjects.DeleteNamespacedCustomObjectAsync(
                group: FluxApi.OciRepoGroup,
                version: FluxApi.V1,
                namespaceParameter: TestNamespace,
                plural: FluxApi.OciRepoPlural,
                name: TestAppName
            );
        }
        catch (k8s.Autorest.HttpOperationException ex)
            when (ex.Response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Object already gone, do nothing
        }
        try
        {
            await _k8sClient.CustomObjects.DeleteNamespacedCustomObjectAsync(
                group: FluxApi.KustomizationGroup,
                version: FluxApi.V1,
                namespaceParameter: TestNamespace,
                plural: FluxApi.KustomizationPlural,
                name: TestAppName
            );
        }
        catch (k8s.Autorest.HttpOperationException ex)
            when (ex.Response.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Object already gone, do nothing
        }
    }

    private async Task RestoreTestApp()
    {
        try
        {
            await _k8sClient.CustomObjects.CreateNamespacedCustomObjectAsync(
                TestAppOciRepo,
                group: FluxApi.OciRepoGroup,
                version: FluxApi.V1,
                namespaceParameter: TestNamespace,
                plural: FluxApi.OciRepoPlural
            );
        }
        catch (k8s.Autorest.HttpOperationException ex)
            when (ex.Response.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            // Already exists, do nothing
        }
        try
        {
            await _k8sClient.CustomObjects.CreateNamespacedCustomObjectAsync(
                TestAppKustomization,
                group: FluxApi.KustomizationGroup,
                version: FluxApi.V1,
                namespaceParameter: TestNamespace,
                plural: FluxApi.KustomizationPlural
            );
        }
        catch (k8s.Autorest.HttpOperationException ex)
            when (ex.Response.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            // Already exists, do nothing
        }
    }

    public async ValueTask DisposeAsync()
    {
        await RestoreTestApp();
        _k8sClient.Dispose();
        _httpClient.Dispose();
    }

    [Fact]
    public async Task TriggerReconcile_ExistingApp_TriggersBothOciRepoAndKustomization()
    {
        var ct = TestContext.Current.CancellationToken;
        var originEnvironment = "local";

        var token = FakeMaskinportenTokenGenerator.GenerateValidToken();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var initialOciRepoAnnotation = await GetOciRepoAnnotationAsync(TestAppName, ct);
        var initialKustomizationAnnotation = await GetKustomizationAnnotationAsync(TestAppName, ct);

        var request = new TriggerReconcileRequest(IsUndeploy: false);
        var response = await _httpClient.PostAsJsonAsync(
            $"/runtime/gateway/api/v1/deploy/apps/{TestAppName}/{originEnvironment}/reconcile",
            request,
            ct
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var newOciRepoAnnotation = await GetOciRepoAnnotationAsync(TestAppName, ct);
        var newKustomizationAnnotation = await GetKustomizationAnnotationAsync(TestAppName, ct);

        Assert.NotNull(newOciRepoAnnotation);
        Assert.NotEqual(initialOciRepoAnnotation, newOciRepoAnnotation);
        Assert.Matches(FluxApi.TimestampPattern(), newOciRepoAnnotation);

        Assert.NotNull(newKustomizationAnnotation);
        Assert.NotEqual(initialKustomizationAnnotation, newKustomizationAnnotation);
        Assert.Matches(FluxApi.TimestampPattern(), newKustomizationAnnotation);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task TriggerReconcile_NewAppOrUndeploy_TriggersSyncrootReconciliation(bool isNewApp, bool isUndeploy)
    {
        try
        {
            if (isNewApp)
            {
                await DeleteTestApp();
            }

            var ct = TestContext.Current.CancellationToken;
            var originEnvironment = "local";

            var token = FakeMaskinportenTokenGenerator.GenerateValidToken();
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var initialOciRepoAnnotation = await GetOciRepoAnnotationAsync(SyncrootOciRepoName, ct);
            var initialKustomizationAnnotation = await GetKustomizationAnnotationAsync(SyncrootKustomizationName, ct);

            // if IsNewApp == true we need to remove ocirepo and kustomization
            var request = new TriggerReconcileRequest(IsUndeploy: isUndeploy);
            var response = await _httpClient.PostAsJsonAsync(
                $"/runtime/gateway/api/v1/deploy/apps/{TestAppName}/{originEnvironment}/reconcile",
                request,
                ct
            );

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var newOciRepoAnnotation = await GetOciRepoAnnotationAsync(SyncrootOciRepoName, ct);
            var newKustomizationAnnotation = await GetKustomizationAnnotationAsync(SyncrootKustomizationName, ct);

            Assert.NotNull(newOciRepoAnnotation);
            Assert.NotEqual(initialOciRepoAnnotation, newOciRepoAnnotation);
            Assert.Matches(FluxApi.TimestampPattern(), newOciRepoAnnotation);

            Assert.NotNull(newKustomizationAnnotation);
            Assert.NotEqual(initialKustomizationAnnotation, newKustomizationAnnotation);
            Assert.Matches(FluxApi.TimestampPattern(), newKustomizationAnnotation);
        }
        finally
        {
            await RestoreTestApp();
        }
    }

    [Fact]
    public async Task TriggerReconcile_TimestampFormat_IsRfc3339()
    {
        var ct = TestContext.Current.CancellationToken;
        var originEnvironment = "local";

        var token = FakeMaskinportenTokenGenerator.GenerateValidToken();
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var request = new TriggerReconcileRequest(IsUndeploy: false);
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

    private async Task<string?> GetOciRepoAnnotationAsync(string name, CancellationToken ct) =>
        await GetReconcileAnnotationAsync(FluxApi.OciRepoGroup, FluxApi.OciRepoPlural, name, ct);

    private async Task<string?> GetKustomizationAnnotationAsync(string name, CancellationToken ct) =>
        await GetReconcileAnnotationAsync(FluxApi.KustomizationGroup, FluxApi.KustomizationPlural, name, ct);

    private async Task<string?> GetReconcileAnnotationAsync(
        string group,
        string plural,
        string name,
        CancellationToken ct
    )
    {
        try
        {
            var result = await _k8sClient.CustomObjects.GetNamespacedCustomObjectAsync(
                group: group,
                version: FluxApi.V1,
                namespaceParameter: TestNamespace,
                plural: plural,
                name: name,
                cancellationToken: ct
            );

            if (
                result is JsonElement element
                && element.TryGetProperty("metadata", out var metadata)
                && metadata.TryGetProperty("annotations", out var annotations)
                && annotations.TryGetProperty(ReconcileAnnotation, out var annotation)
            )
            {
                return annotation.GetString();
            }
        }
        catch
        {
            // Resource might not exist
        }

        return null;
    }
}

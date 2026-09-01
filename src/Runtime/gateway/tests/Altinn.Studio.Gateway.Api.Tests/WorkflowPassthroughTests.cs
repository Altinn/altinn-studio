using System.Net;
using System.Net.Http.Headers;
using Altinn.Studio.Gateway.Api.Application;
using Altinn.Studio.Gateway.Contracts.Workflows;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// In-process tests for the whitelisted workflow engine pass-through: route mapping and
/// query-param forwarding, namespace escaping, authorization, audit logging on mutations,
/// the engine-unavailable envelope, and that nothing outside the whitelist is reachable.
/// </summary>
public sealed class WorkflowPassthroughTests
{
    private const string GatewayPrefix = "/runtime/gateway/api/v1/workflows/apps/my-app";

    /// <summary>
    /// Expected upstream prefix: the configured service owner "TTD" lowercased, joined with the
    /// app as {org}/{app}, and escaped as a single path segment (%2F). Getting this wrong would
    /// address a different engine route, so the exact string is pinned here.
    /// </summary>
    private const string UpstreamPrefix =
        "http://workflow-engine-app.runtime-workflow-engine-app.svc.cluster.local/api/v1/ttd%2Fmy-app";

    private static readonly GatewayApiFactory _factory = new();

    public WorkflowPassthroughTests()
    {
        _factory.EngineHandler.Reset();
        _factory.Logs.Clear();
    }

    private static HttpClient CreateAuthorizedClient(string? token = null)
    {
        var client = _factory.CreateClient();
        token ??= FakeMaskinportenTokenGenerator.GenerateValidToken();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static string GenerateAuditableToken() =>
        FakeMaskinportenTokenGenerator.GenerateToken(
            "altinn:studio/gateway",
            expiry: null,
            additionalClaims: new Dictionary<string, object>
            {
                ["client_id"] = "studio-designer-client",
                ["consumer"] = new Dictionary<string, object>
                {
                    ["authority"] = "iso6523-actorid-upis",
                    ["ID"] = "0192:991825827",
                },
            }
        );

    private static IReadOnlyList<CollectedLogEntry> AuditEntries() =>
        [.. _factory.Logs.Entries.Where(e => e.Category == HandleWorkflows.AuditLoggerCategory)];

    [Fact]
    public async Task ListCollections_ForwardsWhitelistedQueryAndPassesResponseThrough()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();
        _factory.EngineHandler.ResponseFactory = _ =>
            FakeWorkflowEngineHandler.JsonResponse("""{"data":[{"key":"k1"}]}""");

        var response = await client.GetAsync(
            new Uri($"{GatewayPrefix}/collections?key=a%20b&key=c%26d&evil=1", UriKind.Relative),
            ct
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("""{"data":[{"key":"k1"}]}""", await response.Content.ReadAsStringAsync(ct));
        Assert.StartsWith(
            "application/json",
            response.Content.Headers.ContentType?.ToString(),
            StringComparison.Ordinal
        );

        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal(HttpMethod.Get, upstream.Method);
        Assert.Equal($"{UpstreamPrefix}/collections?key=a%20b&key=c%26d", upstream.Uri.AbsoluteUri);

        // Reads are not audited
        Assert.Empty(AuditEntries());
    }

    [Fact]
    public async Task ListCollections_ForwardsDiscoverAndPaginationParams()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();

        var response = await client.GetAsync(
            new Uri($"{GatewayPrefix}/collections?failures=any&cursor=abc&pageSize=10", UriKind.Relative),
            ct
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal($"{UpstreamPrefix}/collections?failures=any&cursor=abc&pageSize=10", upstream.Uri.AbsoluteUri);
    }

    [Fact]
    public async Task GetCollection_EscapesKeyAsSinglePathSegment()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();

        var response = await client.GetAsync(new Uri($"{GatewayPrefix}/collections/my%20key", UriKind.Relative), ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal($"{UpstreamPrefix}/collections/my%20key", upstream.Uri.AbsoluteUri);
    }

    [Fact]
    public async Task ListWorkflows_ForwardsAllWhitelistedFilters()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();
        var cursor = Guid.NewGuid();

        var response = await client.GetAsync(
            new Uri(
                $"{GatewayPrefix}/workflows?collectionKey=col-1&status=Failed&status=Canceled&label=step:pdf&isHead=false&cursor={cursor}&pageSize=5",
                UriKind.Relative
            ),
            ct
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal(
            $"{UpstreamPrefix}/workflows?collectionKey=col-1&status=Failed&status=Canceled&label=step%3Apdf&isHead=false&cursor={cursor}&pageSize=5",
            upstream.Uri.AbsoluteUri
        );
    }

    [Fact]
    public async Task GetWorkflow_ForwardsById()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();
        var workflowId = Guid.NewGuid();

        var response = await client.GetAsync(new Uri($"{GatewayPrefix}/workflows/{workflowId}", UriKind.Relative), ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal($"{UpstreamPrefix}/workflows/{workflowId}", upstream.Uri.AbsoluteUri);
    }

    [Fact]
    public async Task ResumeWorkflow_DefaultsCascadeFalse_AndEmitsAuditLine()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient(GenerateAuditableToken());
        var workflowId = Guid.NewGuid();
        _factory.EngineHandler.ResponseFactory = _ =>
            FakeWorkflowEngineHandler.JsonResponse($$"""{"workflowId":"{{workflowId}}"}""", HttpStatusCode.Accepted);

        var response = await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{workflowId}/resume", UriKind.Relative),
            content: null,
            ct
        );

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Contains(workflowId.ToString(), await response.Content.ReadAsStringAsync(ct), StringComparison.Ordinal);

        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal(HttpMethod.Post, upstream.Method);
        Assert.Equal($"{UpstreamPrefix}/workflows/{workflowId}/resume?cascade=false", upstream.Uri.AbsoluteUri);

        var audit = Assert.Single(AuditEntries());
        Assert.Contains("resume", audit.Message, StringComparison.Ordinal);
        Assert.Contains(workflowId.ToString(), audit.Message, StringComparison.Ordinal);
        Assert.Contains("ttd/my-app", audit.Message, StringComparison.Ordinal);
        Assert.Contains("studio-designer-client", audit.Message, StringComparison.Ordinal);
        Assert.Contains("0192:991825827", audit.Message, StringComparison.Ordinal);
        Assert.Contains("202", audit.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ResumeWorkflow_ForwardsCascadeTrue()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();
        var workflowId = Guid.NewGuid();

        await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{workflowId}/resume?cascade=true", UriKind.Relative),
            content: null,
            ct
        );

        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal($"{UpstreamPrefix}/workflows/{workflowId}/resume?cascade=true", upstream.Uri.AbsoluteUri);
    }

    [Fact]
    public async Task AbandonWorkflow_ForwardsAndEmitsAuditLine()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient(GenerateAuditableToken());
        var workflowId = Guid.NewGuid();
        _factory.EngineHandler.ResponseFactory = _ =>
            FakeWorkflowEngineHandler.JsonResponse($$"""{"workflowId":"{{workflowId}}"}""", HttpStatusCode.Accepted);

        var response = await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{workflowId}/abandon", UriKind.Relative),
            content: null,
            ct
        );

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal($"{UpstreamPrefix}/workflows/{workflowId}/abandon", upstream.Uri.AbsoluteUri);

        var audit = Assert.Single(AuditEntries());
        Assert.Contains("abandon", audit.Message, StringComparison.Ordinal);
        Assert.Contains("studio-designer-client", audit.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task EngineErrorResponses_PassThroughUnmodified()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();
        _factory.EngineHandler.ResponseFactory = _ =>
            FakeWorkflowEngineHandler.JsonResponse(
                """{"title":"Workflow cannot be resumed","status":409}""",
                HttpStatusCode.Conflict,
                "application/problem+json"
            );

        var response = await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{Guid.NewGuid()}/resume", UriKind.Relative),
            content: null,
            ct
        );

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.StartsWith(
            "application/problem+json",
            response.Content.Headers.ContentType?.ToString(),
            StringComparison.Ordinal
        );
        Assert.Contains(
            "Workflow cannot be resumed",
            await response.Content.ReadAsStringAsync(ct),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task EngineNoContent_PassesThrough()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();
        _factory.EngineHandler.ResponseFactory = _ => new HttpResponseMessage(HttpStatusCode.NoContent);

        var response = await client.GetAsync(new Uri($"{GatewayPrefix}/workflows", UriKind.Relative), ct);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task EngineUnreachable_ReturnsDistinctUnavailableEnvelope_WithoutLeakingDetails()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();
        _factory.EngineHandler.ExceptionToThrow = new HttpRequestException(
            "Connection refused (workflow-engine-app:80) - secret internal detail"
        );

        var response = await client.GetAsync(new Uri($"{GatewayPrefix}/collections", UriKind.Relative), ct);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.StartsWith(
            "application/problem+json",
            response.Content.Headers.ContentType?.ToString(),
            StringComparison.Ordinal
        );
        var body = await response.Content.ReadAsStringAsync(ct);
        Assert.Contains(GatewayProblem.WorkflowEngineUnavailableType, body, StringComparison.Ordinal);
        Assert.DoesNotContain("secret internal detail", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task EngineTimeout_ReturnsUnavailableEnvelope_AndAuditsAttemptedMutation()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient(GenerateAuditableToken());
        _factory.EngineHandler.ExceptionToThrow = new TaskCanceledException("request timed out");

        var response = await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{Guid.NewGuid()}/abandon", UriKind.Relative),
            content: null,
            ct
        );

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(ct);
        Assert.Contains(GatewayProblem.WorkflowEngineUnavailableType, body, StringComparison.Ordinal);

        var audit = Assert.Single(AuditEntries());
        Assert.Contains("abandon", audit.Message, StringComparison.Ordinal);
        Assert.Contains("engine unavailable", audit.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("My-App")]
    [InlineData("my_app")]
    [InlineData("1app")]
    [InlineData("-app")]
    public async Task InvalidAppName_ReturnsBadRequest_WithoutContactingEngine(string app)
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();

        var response = await client.GetAsync(
            new Uri($"/runtime/gateway/api/v1/workflows/apps/{app}/collections", UriKind.Relative),
            ct
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            GatewayProblem.InvalidAppNameType,
            await response.Content.ReadAsStringAsync(ct),
            StringComparison.Ordinal
        );
        Assert.Empty(_factory.EngineHandler.Requests);
    }

    [Fact]
    public async Task WithoutToken_ReturnsUnauthorized()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(new Uri($"{GatewayPrefix}/collections", UriKind.Relative), ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(_factory.EngineHandler.Requests);
    }

    [Fact]
    public async Task WithWrongScope_ReturnsForbidden()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient(FakeMaskinportenTokenGenerator.GenerateTokenWithWrongScope());

        var response = await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{Guid.NewGuid()}/resume", UriKind.Relative),
            content: null,
            ct
        );

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Empty(_factory.EngineHandler.Requests);
    }

    [Theory]
    // Engine routes deliberately NOT whitelisted must not be reachable through the gateway.
    [InlineData("POST", "/workflows/00000000-0000-0000-0000-000000000001/cancel", HttpStatusCode.NotFound)]
    [InlineData("POST", "/workflows/00000000-0000-0000-0000-000000000001/nudge", HttpStatusCode.NotFound)]
    [InlineData("GET", "/workflows/00000000-0000-0000-0000-000000000001/dependency-graph", HttpStatusCode.NotFound)]
    [InlineData("GET", "/namespaces", HttpStatusCode.NotFound)]
    [InlineData("POST", "/workflows", HttpStatusCode.MethodNotAllowed)] // enqueue
    [InlineData("POST", "/collections", HttpStatusCode.MethodNotAllowed)]
    [InlineData("DELETE", "/workflows/00000000-0000-0000-0000-000000000001", HttpStatusCode.MethodNotAllowed)]
    public async Task RoutesOutsideTheWhitelist_AreNotReachable(
        string method,
        string path,
        HttpStatusCode expectedStatusCode
    )
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();
        using var request = new HttpRequestMessage(
            HttpMethod.Parse(method),
            new Uri(GatewayPrefix + path, UriKind.Relative)
        );

        var response = await client.SendAsync(request, ct);

        Assert.Equal(expectedStatusCode, response.StatusCode);
        Assert.Empty(_factory.EngineHandler.Requests);
    }

    [Fact]
    public async Task EngineNamespaceRoutes_AreNotDirectlyExposed()
    {
        // The raw engine route shape (/api/v1/{ns}/...) must not exist on the gateway.
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();

        var response = await client.GetAsync(
            new Uri("/runtime/gateway/api/v1/ttd%2Fmy-app/collections", UriKind.Relative),
            ct
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Empty(_factory.EngineHandler.Requests);
    }
}

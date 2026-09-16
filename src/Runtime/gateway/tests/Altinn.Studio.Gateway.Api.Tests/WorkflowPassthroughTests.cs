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
    private const string UpstreamPrefix = GatewayApiFactory.ConfiguredEngineBaseUrl + "/api/v1/ttd%2Fmy-app";

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
            new Uri($"{GatewayPrefix}/collections?key=a%20b&key=c%26d", UriKind.Relative),
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

    [Theory]
    // Whatever the key contains, it must reach the engine as one escaped path segment under
    // /collections/ — never as a path that addresses a different engine route.
    [InlineData("my%20key", "my%20key")]
    // Dot-dot and a slash: an escape lapse would step out of /collections/. ASP.NET leaves %2F
    // encoded in route values, so the gateway sees "..%2Fworkflows" and escapes the percent
    // sign too — the engine receives one segment, and a key with a literal slash cannot be
    // addressed through the gateway at all, which is the safe side to land on.
    [InlineData("..%2Fworkflows", "..%252Fworkflows")]
    [InlineData("a%3Fb%23c", "a%3Fb%23c")] // ? and #: an escape lapse would start a query or fragment
    [InlineData("key%0A", "key%0A")] // a control character
    public async Task GetCollection_EscapesKeyAsSinglePathSegment(string requestedKey, string forwardedKey)
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();

        var response = await client.GetAsync(
            new Uri($"{GatewayPrefix}/collections/{requestedKey}", UriKind.Relative),
            ct
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal($"{UpstreamPrefix}/collections/{forwardedKey}", upstream.Uri.AbsoluteUri);
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
    public async Task NudgeWorkflow_ForwardsWithoutBody_AndEmitsAuditLine()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient(GenerateAuditableToken());
        var workflowId = Guid.NewGuid();
        _factory.EngineHandler.ResponseFactory = _ =>
            FakeWorkflowEngineHandler.JsonResponse(
                $$"""{"workflowId":"{{workflowId}}","nudgedAt":"2026-08-02T10:00:00Z"}""",
                HttpStatusCode.Accepted
            );

        var response = await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{workflowId}/nudge", UriKind.Relative),
            content: null,
            ct
        );

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal(HttpMethod.Post, upstream.Method);
        Assert.Equal($"{UpstreamPrefix}/workflows/{workflowId}/nudge", upstream.Uri.AbsoluteUri);
        Assert.Null(upstream.Body);

        var audit = Assert.Single(AuditEntries());
        Assert.Contains("nudge", audit.Message, StringComparison.Ordinal);
        Assert.Contains(workflowId.ToString(), audit.Message, StringComparison.Ordinal);
        Assert.Contains("studio-designer-client", audit.Message, StringComparison.Ordinal);
        Assert.Contains("202", audit.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task FailWorkflow_ForwardsOnlyTheReason_AndEmitsAuditLine()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient(GenerateAuditableToken());
        var workflowId = Guid.NewGuid();
        _factory.EngineHandler.ResponseFactory = _ =>
            FakeWorkflowEngineHandler.JsonResponse($$"""{"workflowId":"{{workflowId}}"}""", HttpStatusCode.Accepted);

        // Anything beside the reason is dropped on the way: the engine sees the one field the route accepts.
        using var content = new StringContent(
            """{"reason":"Failed by Studio user ola from Altinn Studio","extra":"dropped"}""",
            System.Text.Encoding.UTF8,
            "application/json"
        );
        var response = await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{workflowId}/fail", UriKind.Relative),
            content,
            ct
        );

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Equal(HttpMethod.Post, upstream.Method);
        Assert.Equal($"{UpstreamPrefix}/workflows/{workflowId}/fail", upstream.Uri.AbsoluteUri);
        Assert.Equal("application/json", upstream.ContentType);
        Assert.Equal("""{"reason":"Failed by Studio user ola from Altinn Studio"}""", upstream.Body);

        var audit = Assert.Single(AuditEntries());
        Assert.Contains("fail", audit.Message, StringComparison.Ordinal);
        Assert.Contains(workflowId.ToString(), audit.Message, StringComparison.Ordinal);
        Assert.Contains("202", audit.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task FailWorkflow_WithoutBody_ForwardsNoBody()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();
        var workflowId = Guid.NewGuid();

        var response = await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{workflowId}/fail", UriKind.Relative),
            content: null,
            ct
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var upstream = Assert.Single(_factory.EngineHandler.Requests);
        Assert.Null(upstream.Body);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("x", 501)]
    public async Task FailWorkflow_RejectsBlankOrOverlongReason_WithoutContactingEngine(string reason, int repeat = 1)
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();
        var body = System.Text.Json.JsonSerializer.Serialize(
            new Dictionary<string, string> { ["reason"] = string.Concat(Enumerable.Repeat(reason, repeat)) }
        );

        using var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
        var response = await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{Guid.NewGuid()}/fail", UriKind.Relative),
            content,
            ct
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            $"\"type\":\"{GatewayProblem.InvalidFailReasonType}\"",
            await response.Content.ReadAsStringAsync(ct),
            StringComparison.Ordinal
        );
        Assert.Empty(_factory.EngineHandler.Requests);
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
        // Phase 3 (Designer) discriminates on the camelCase "type" key carrying the URN —
        // pin the literal wire shape, not just the URN substring.
        Assert.Contains($"\"type\":\"{GatewayProblem.WorkflowEngineUnavailableType}\"", body, StringComparison.Ordinal);
        Assert.DoesNotContain("secret internal detail", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task EngineTimeout_ReturnsUnavailableEnvelope_AndAuditsAttemptedMutation()
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient(GenerateAuditableToken());
        _factory.EngineHandler.ExceptionToThrow = new TaskCanceledException("request timed out");

        var response = await client.PostAsync(
            new Uri($"{GatewayPrefix}/workflows/{Guid.NewGuid()}/nudge", UriKind.Relative),
            content: null,
            ct
        );

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(ct);
        Assert.Contains(GatewayProblem.WorkflowEngineUnavailableType, body, StringComparison.Ordinal);

        var audit = Assert.Single(AuditEntries());
        Assert.Contains("nudge", audit.Message, StringComparison.Ordinal);
        Assert.Contains("engine unavailable", audit.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("My-App")]
    [InlineData("my_app")]
    [InlineData("1app")]
    [InlineData("-app")]
    [InlineData("my-app%0A")] // a trailing newline: $ would admit it, \z does not
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
            $"\"type\":\"{GatewayProblem.InvalidAppNameType}\"",
            await response.Content.ReadAsStringAsync(ct),
            StringComparison.Ordinal
        );
        Assert.Empty(_factory.EngineHandler.Requests);
    }

    [Theory]
    // Unknown query parameters are rejected loudly instead of silently dropped, so version
    // skew between centrally deployed Designer and per-cluster gateways cannot yield
    // 200 with unfiltered data.
    [InlineData("/collections?key=a&evil=1")]
    [InlineData("/workflows?isHead=true&keys=a")] // near-miss of the real "key"/"collectionKey" names
    [InlineData("/workflows/00000000-0000-0000-0000-000000000001?verbose=true")] // route allows no params
    public async Task UnknownQueryParameters_ReturnBadRequest_WithoutContactingEngine(string pathAndQuery)
    {
        var ct = TestContext.Current.CancellationToken;
        using var client = CreateAuthorizedClient();

        var response = await client.GetAsync(new Uri(GatewayPrefix + pathAndQuery, UriKind.Relative), ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            $"\"type\":\"{GatewayProblem.UnknownQueryParameterType}\"",
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
    [InlineData("POST", "/workflows/00000000-0000-0000-0000-000000000001/abandon", HttpStatusCode.NotFound)]
    [InlineData("GET", "/workflows/00000000-0000-0000-0000-000000000001/dependency-graph", HttpStatusCode.NotFound)]
    [InlineData("GET", "/namespaces", HttpStatusCode.NotFound)]
    [InlineData("POST", "/workflows", HttpStatusCode.MethodNotAllowed)] // enqueue
    [InlineData("POST", "/collections", HttpStatusCode.MethodNotAllowed)]
    [InlineData("DELETE", "/workflows/00000000-0000-0000-0000-000000000001", HttpStatusCode.MethodNotAllowed)]
    [InlineData("GET", "/throttle", HttpStatusCode.NotFound)]
    [InlineData("POST", "/throttle/trip", HttpStatusCode.NotFound)]
    [InlineData("POST", "/throttle/clear", HttpStatusCode.NotFound)]
    [InlineData("POST", "/mailboxes", HttpStatusCode.NotFound)]
    [InlineData("GET", "/mailboxes/00000000-0000-0000-0000-000000000001", HttpStatusCode.NotFound)]
    [InlineData("DELETE", "/mailboxes/00000000-0000-0000-0000-000000000001", HttpStatusCode.NotFound)]
    [InlineData("POST", "/mailboxes/00000000-0000-0000-0000-000000000001/deliveries", HttpStatusCode.NotFound)]
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
    public async Task EngineStallsAfterHeaders_DegradesToEngineUnavailable()
    {
        // The engine answers its headers and then never sends a byte. HttpClient's own timeout
        // is gone once the headers are in (the response is read headers-first so the body can
        // stream), so only the pass-through's body budget stands between this and a request that
        // lasts as long as the caller is prepared to wait.
        var ct = TestContext.Current.CancellationToken;
        _factory.EngineHandler.ResponseFactory = _ =>
        {
            var stalled = new HttpResponseMessage(HttpStatusCode.OK);
            stalled.Content = new StreamContent(new StallingStream());
            stalled.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
            return stalled;
        };
        using var client = CreateAuthorizedClient();

        var response = await client.GetAsync(new Uri($"{GatewayPrefix}/workflows", UriKind.Relative), ct);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Contains(
            $"\"type\":\"{GatewayProblem.WorkflowEngineUnavailableType}\"",
            await response.Content.ReadAsStringAsync(ct),
            StringComparison.Ordinal
        );
    }

    /// <summary>A read-only stream whose reads complete only by cancellation.</summary>
    private sealed class StallingStream : Stream
    {
        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override async ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default
        )
        {
            await Task.Delay(Timeout.Infinite, cancellationToken);
            return 0;
        }

        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        public override void Flush() { }

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
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

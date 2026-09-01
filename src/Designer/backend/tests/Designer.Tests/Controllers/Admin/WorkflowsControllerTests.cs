using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;
using WorkflowsAdminController = Altinn.Studio.Designer.Controllers.Admin.WorkflowsController;

namespace Designer.Tests.Controllers.Admin;

public class WorkflowsControllerTests
    : DesignerEndpointsTestsBase<WorkflowsControllerTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Env = "at23";
    private const string App = "my-app";

    private const string EngineUnavailableProblemType = "urn:altinn:studio:gateway:workflow-engine-unavailable";

    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClientMock = new();
    private readonly Mock<IGiteaClient> _giteaClientMock = new();
    private readonly CapturingLoggerProvider _loggerProvider = new();

    public WorkflowsControllerTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        _giteaClientMock
            .Setup(client => client.GetTeams())
            .ReturnsAsync([AdminTeam(Org, Env), AdminTeam(Org, "fake-env"), AdminTeam(Org, "bad env")]);
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.RemoveAll<IRuntimeGatewayClient>();
        services.AddSingleton(_runtimeGatewayClientMock.Object);
        services.RemoveAll<IGiteaClient>();
        services.AddSingleton(_giteaClientMock.Object);
        services.AddSingleton<ILoggerProvider>(_loggerProvider);
    }

    private static string BasePath(string org = Org, string env = Env, string app = App) =>
        $"/designer/api/v1/admin/workflows/{org}/{env}/{app}";

    private static Team AdminTeam(string org, string env) =>
        new Team
        {
            Name = $"Admin-{env}",
            Organization = new Organization { Username = org },
        };

    private static HttpResponseMessage JsonResponse(
        HttpStatusCode statusCode,
        string body,
        string contentType = "application/json"
    )
    {
        return new HttpResponseMessage(statusCode) { Content = new StringContent(body, Encoding.UTF8, contentType) };
    }

    private IReadOnlyList<string> AuditMessages() =>
        _loggerProvider
            .Entries.Where(entry => entry.Category == WorkflowsAdminController.AuditLoggerCategory)
            .Select(entry => entry.Message)
            .ToList();

    [Fact]
    public async Task GetCollections_ForwardsQueryParameters_AndPassesResponseThrough()
    {
        const string upstreamBody = /*lang=json,strict*/
            """{"collections":[{"key":"a"}],"unmatchedKeys":["k2"]}""";
        IReadOnlyList<string> capturedKeys = null;
        (string Failures, string Cursor, int? PageSize) capturedQuery = default;
        (string Org, string App, string Env) capturedTarget = default;
        _runtimeGatewayClientMock
            .Setup(client =>
                client.GetWorkflowCollectionsAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (
                    string org,
                    string app,
                    AltinnEnvironment environment,
                    IReadOnlyList<string> keys,
                    string failures,
                    string cursor,
                    int? pageSize,
                    CancellationToken _
                ) =>
                {
                    capturedTarget = (org, app, environment.Name);
                    capturedKeys = keys;
                    capturedQuery = (failures, cursor, pageSize);
                }
            )
            .ReturnsAsync(JsonResponse(HttpStatusCode.OK, upstreamBody));

        using var response = await HttpClient.GetAsync(
            $"{BasePath()}/collections?key=k%2F1&key=k2&failures=any&cursor=cur%20sor&pageSize=7"
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(upstreamBody, await response.Content.ReadAsStringAsync());
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal((Org, App, Env), capturedTarget);
        Assert.Equal(["k/1", "k2"], capturedKeys);
        Assert.Equal(("any", "cur sor", 7), capturedQuery);
    }

    [Fact]
    public async Task GetCollection_DelegatesWithKey_AndPassesResponseThrough()
    {
        const string upstreamBody = /*lang=json,strict*/
            """{"key":"0f8fad5b-d9cb-469f-a165-70867728950e","workflowCounts":{"failedVisible":1}}""";
        _runtimeGatewayClientMock
            .Setup(client =>
                client.GetWorkflowCollectionAsync(
                    Org,
                    App,
                    It.Is<AltinnEnvironment>(environment => environment.Name == Env),
                    "0f8fad5b-d9cb-469f-a165-70867728950e",
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(JsonResponse(HttpStatusCode.OK, upstreamBody));

        using var response = await HttpClient.GetAsync(
            $"{BasePath()}/collections/0f8fad5b-d9cb-469f-a165-70867728950e"
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(upstreamBody, await response.Content.ReadAsStringAsync());
        _runtimeGatewayClientMock.VerifyAll();
    }

    [Fact]
    public async Task GetWorkflows_ForwardsFilters_AndPassesResponseThrough()
    {
        const string upstreamBody = /*lang=json,strict*/
            """{"workflows":[],"cursor":null}""";
        IReadOnlyList<string> capturedStatuses = null;
        IReadOnlyList<string> capturedLabels = null;
        (string CollectionKey, bool? IsHead, string Cursor, int? PageSize) capturedQuery = default;
        _runtimeGatewayClientMock
            .Setup(client =>
                client.GetWorkflowsAsync(
                    Org,
                    App,
                    It.Is<AltinnEnvironment>(environment => environment.Name == Env),
                    It.IsAny<string>(),
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<bool?>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (
                    string _,
                    string _,
                    AltinnEnvironment _,
                    string collectionKey,
                    IReadOnlyList<string> statuses,
                    IReadOnlyList<string> labels,
                    bool? isHead,
                    string cursor,
                    int? pageSize,
                    CancellationToken _
                ) =>
                {
                    capturedStatuses = statuses;
                    capturedLabels = labels;
                    capturedQuery = (collectionKey, isHead, cursor, pageSize);
                }
            )
            .ReturnsAsync(JsonResponse(HttpStatusCode.OK, upstreamBody));

        using var response = await HttpClient.GetAsync(
            $"{BasePath()}/workflows?collectionKey=col1&status=Failed&status=AwaitingRetry&label=step%3Apdf&isHead=false&cursor=c1&pageSize=3"
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(upstreamBody, await response.Content.ReadAsStringAsync());
        Assert.Equal(["Failed", "AwaitingRetry"], capturedStatuses);
        Assert.Equal(["step:pdf"], capturedLabels);
        Assert.Equal(("col1", false, "c1", 3), capturedQuery);
    }

    [Fact]
    public async Task GetWorkflow_DelegatesWithWorkflowId_AndPassesResponseThrough()
    {
        var workflowId = Guid.NewGuid();
        string upstreamBody = /*lang=json,strict*/
            $$"""{"id":"{{workflowId}}","status":"Failed"}""";
        _runtimeGatewayClientMock
            .Setup(client =>
                client.GetWorkflowAsync(
                    Org,
                    App,
                    It.Is<AltinnEnvironment>(environment => environment.Name == Env),
                    workflowId,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(JsonResponse(HttpStatusCode.OK, upstreamBody));

        using var response = await HttpClient.GetAsync($"{BasePath()}/workflows/{workflowId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(upstreamBody, await response.Content.ReadAsStringAsync());
        _runtimeGatewayClientMock.VerifyAll();
    }

    [Fact]
    public async Task GetWorkflow_NonGuidWorkflowId_IsNotRouted()
    {
        using var response = await HttpClient.GetAsync($"{BasePath()}/workflows/not-a-guid");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        _runtimeGatewayClientMock.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData("?cascade=true", true)]
    [InlineData("", false)]
    public async Task ResumeWorkflow_ForwardsCascade_PassesResponseThrough_AndAudits(
        string queryString,
        bool expectedCascade
    )
    {
        var workflowId = Guid.NewGuid();
        _runtimeGatewayClientMock
            .Setup(client =>
                client.ResumeWorkflowAsync(
                    Org,
                    App,
                    It.Is<AltinnEnvironment>(environment => environment.Name == Env),
                    workflowId,
                    expectedCascade,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.NoContent));

        using var response = await HttpClient.PostAsync(
            $"{BasePath()}/workflows/{workflowId}/resume{queryString}",
            content: null
        );

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _runtimeGatewayClientMock.VerifyAll();

        string auditMessage = Assert.Single(AuditMessages());
        Assert.Contains("resume", auditMessage);
        Assert.Contains(workflowId.ToString(), auditMessage);
        Assert.Contains($"{Org}/{App} ({Env})", auditMessage);
        Assert.Contains("testUser", auditMessage);
        Assert.Contains("outcome: 204", auditMessage);
    }

    [Fact]
    public async Task AbandonWorkflow_PassesResponseThrough_AndAudits()
    {
        var workflowId = Guid.NewGuid();
        const string upstreamBody = /*lang=json,strict*/
            """{"status":"Abandoned"}""";
        _runtimeGatewayClientMock
            .Setup(client =>
                client.AbandonWorkflowAsync(
                    Org,
                    App,
                    It.Is<AltinnEnvironment>(environment => environment.Name == Env),
                    workflowId,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(JsonResponse(HttpStatusCode.OK, upstreamBody));

        using var response = await HttpClient.PostAsync($"{BasePath()}/workflows/{workflowId}/abandon", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(upstreamBody, await response.Content.ReadAsStringAsync());

        string auditMessage = Assert.Single(AuditMessages());
        Assert.Contains("abandon", auditMessage);
        Assert.Contains(workflowId.ToString(), auditMessage);
        Assert.Contains("testUser", auditMessage);
        Assert.Contains("outcome: 200", auditMessage);
    }

    [Fact]
    public async Task Reads_DoNotEmitAuditLines()
    {
        _runtimeGatewayClientMock
            .Setup(client =>
                client.GetWorkflowCollectionsAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(JsonResponse(HttpStatusCode.OK, "{}"));

        using var response = await HttpClient.GetAsync($"{BasePath()}/collections");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(AuditMessages());
    }

    [Fact]
    public async Task UpstreamBadRequest_PassesThroughUnmodified()
    {
        const string upstreamBody = /*lang=json,strict*/
            """{"type":"urn:altinn:workflow-engine:validation","title":"Bad request","status":400}""";
        _runtimeGatewayClientMock
            .Setup(client =>
                client.GetWorkflowCollectionsAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(JsonResponse(HttpStatusCode.BadRequest, upstreamBody, "application/problem+json"));

        using var response = await HttpClient.GetAsync($"{BasePath()}/collections?failures=bogus");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(upstreamBody, await response.Content.ReadAsStringAsync());
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task EngineUnavailable_PassesThrough502WithGatewayProblemType()
    {
        const string upstreamBody =
            $$"""{"type":"{{EngineUnavailableProblemType}}","title":"Workflow engine unavailable","status":502,"detail":"The workflow engine could not be reached."}""";
        _runtimeGatewayClientMock
            .Setup(client =>
                client.GetWorkflowCollectionsAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(JsonResponse(HttpStatusCode.BadGateway, upstreamBody, "application/problem+json"));

        using var response = await HttpClient.GetAsync($"{BasePath()}/collections");

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        Assert.Equal(upstreamBody, body);
        Assert.Contains(EngineUnavailableProblemType, body);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task GatewayUnreachable_Returns502Problem_WithoutExceptionDetails_AndAuditsMutation()
    {
        var workflowId = Guid.NewGuid();
        _runtimeGatewayClientMock
            .Setup(client =>
                client.ResumeWorkflowAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<Guid>(),
                    It.IsAny<bool>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("connection refused to internal-host:5005"));

        using var response = await HttpClient.PostAsync($"{BasePath()}/workflows/{workflowId}/resume", content: null);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        Assert.Contains(WorkflowsAdminController.RuntimeGatewayUnavailableType, body);
        Assert.DoesNotContain("internal-host", body);

        string auditMessage = Assert.Single(AuditMessages());
        Assert.Contains("resume", auditMessage);
        Assert.Contains("outcome: runtime gateway unavailable", auditMessage);
    }

    [Fact]
    public async Task UnknownEnvironment_Returns404Problem()
    {
        _runtimeGatewayClientMock
            .Setup(client =>
                client.GetWorkflowCollectionsAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<IReadOnlyList<string>>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new KeyNotFoundException("Environment 'fake-env' not found."));

        using var response = await HttpClient.GetAsync($"{BasePath(env: "fake-env")}/collections");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains(WorkflowsAdminController.EnvironmentNotFoundType, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task InvalidEnvironmentName_Returns400_WithoutCallingGateway()
    {
        using var response = await HttpClient.GetAsync($"{BasePath(env: "bad%20env")}/collections");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            WorkflowsAdminController.InvalidEnvironmentNameType,
            await response.Content.ReadAsStringAsync()
        );
        _runtimeGatewayClientMock.VerifyNoOtherCalls();
    }

    // Exercised at controller level: the request-synchronization middleware guards org/app route
    // values with the same app-name regex and throws (a 500) before MVC runs, for every controller
    // with an {app} route value — so the controller's own 400 cannot be reached over HTTP today.
    [Fact]
    public async Task InvalidAppName_Returns400_WithoutCallingGateway()
    {
        var controller = new WorkflowsAdminController(
            _runtimeGatewayClientMock.Object,
            NullLogger<WorkflowsAdminController>.Instance,
            NullLoggerFactory.Instance
        );

        IActionResult result = await controller.GetCollections(
            Org,
            Env,
            "1nvalid.app",
            keys: null,
            failures: null,
            cursor: null,
            pageSize: null,
            CancellationToken.None
        );

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
        var problemDetails = Assert.IsType<ProblemDetails>(objectResult.Value);
        Assert.Equal(WorkflowsAdminController.InvalidAppNameType, problemDetails.Type);
        _runtimeGatewayClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task UserWithoutAdminTeam_IsForbidden_WithoutCallingGateway()
    {
        var workflowId = Guid.NewGuid();

        using var readResponse = await HttpClient.GetAsync($"{BasePath(env: "tt02")}/collections");
        using var mutationResponse = await HttpClient.PostAsync(
            $"{BasePath(env: "tt02")}/workflows/{workflowId}/abandon",
            content: null
        );

        Assert.Equal(HttpStatusCode.Forbidden, readResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, mutationResponse.StatusCode);
        _runtimeGatewayClientMock.VerifyNoOtherCalls();
        Assert.Empty(AuditMessages());
    }

    private sealed class CapturingLoggerProvider : ILoggerProvider
    {
        public ConcurrentQueue<(string Category, string Message)> Entries { get; } = new();

        public ILogger CreateLogger(string categoryName) => new CapturingLogger(categoryName, Entries);

        public void Dispose() { }

        private sealed class CapturingLogger : ILogger
        {
            private readonly string _categoryName;
            private readonly ConcurrentQueue<(string Category, string Message)> _entries;

            public CapturingLogger(string categoryName, ConcurrentQueue<(string Category, string Message)> entries)
            {
                _categoryName = categoryName;
                _entries = entries;
            }

            public IDisposable BeginScope<TState>(TState state)
                where TState : notnull => null;

            public bool IsEnabled(LogLevel logLevel) => true;

            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception exception,
                Func<TState, Exception, string> formatter
            )
            {
                _entries.Enqueue((_categoryName, formatter(state, exception)));
            }
        }
    }
}

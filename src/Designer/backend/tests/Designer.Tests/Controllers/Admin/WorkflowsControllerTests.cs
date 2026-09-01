using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
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
using Moq;
using Polly.CircuitBreaker;
using Polly.Timeout;
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

    private IReadOnlyList<string> AuditMessages() => AuditMessages(_loggerProvider);

    private static IReadOnlyList<string> AuditMessages(CapturingLoggerProvider loggerProvider) =>
        loggerProvider
            .Entries.Where(entry => entry.Category == WorkflowsAdminController.AuditLoggerCategory)
            .Select(entry => entry.Message)
            .ToList();

    /// <summary>
    /// Every mutation records an attempt line before the gateway call and an outcome line after it,
    /// so a mutation that never completes is still attributed to the operator who asked for it.
    /// </summary>
    private (string Attempt, string Outcome) AssertAttemptAndOutcomeAudited() =>
        AssertAttemptAndOutcomeAudited(AuditMessages());

    private static (string Attempt, string Outcome) AssertAttemptAndOutcomeAudited(IReadOnlyList<string> auditMessages)
    {
        Assert.Equal(2, auditMessages.Count);
        Assert.Contains("Workflow mutation attempted:", auditMessages[0]);
        Assert.Contains("outcome:", auditMessages[1]);
        return (auditMessages[0], auditMessages[1]);
    }

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

        (string attempt, string outcome) = AssertAttemptAndOutcomeAudited();
        foreach (string auditMessage in new[] { attempt, outcome })
        {
            Assert.Contains("resume", auditMessage);
            Assert.Contains(workflowId.ToString(), auditMessage);
            Assert.Contains($"{Org}/{App} ({Env})", auditMessage);
            Assert.Contains("testUser", auditMessage);
        }
        Assert.Contains("outcome: 204", outcome);
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

        (string attempt, string outcome) = AssertAttemptAndOutcomeAudited();
        Assert.Contains("abandon", attempt);
        Assert.Contains(workflowId.ToString(), attempt);
        Assert.Contains("testUser", attempt);
        Assert.Contains("outcome: 200", outcome);
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

        (string attempt, string outcome) = AssertAttemptAndOutcomeAudited();
        Assert.Contains("resume", attempt);
        Assert.Contains("outcome: runtime gateway unavailable", outcome);
    }

    [Theory]
    [InlineData(typeof(TimeoutRejectedException))]
    [InlineData(typeof(BrokenCircuitException))]
    public async Task ResiliencePipelineRejection_Returns502Problem_WithoutExceptionDetails(Type exceptionType)
    {
        var pipelineRejection = (Exception)
            Activator.CreateInstance(exceptionType, "the pipeline rejected the call to internal-host:5005");
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
            .ThrowsAsync(pipelineRejection);

        using var response = await HttpClient.GetAsync($"{BasePath()}/collections");

        // A pipeline rejection is an outage by another name — it must carry the same URN the
        // frontend maps to "unavailable", not fall through to a bare 500.
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        Assert.Contains(WorkflowsAdminController.RuntimeGatewayUnavailableType, body);
        Assert.DoesNotContain("internal-host", body);
    }

    [Fact]
    public async Task EnvironmentsRegistryUnavailable_Returns503Problem_NotBlamingTheGateway()
    {
        var workflowId = Guid.NewGuid();
        _runtimeGatewayClientMock
            .Setup(client =>
                client.AbandonWorkflowAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<Guid>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(
                new EnvironmentsRegistryUnavailableException(
                    "environments.json unreachable at internal-host:5005",
                    new HttpRequestException("connection refused")
                )
            );

        using var response = await HttpClient.PostAsync($"{BasePath()}/workflows/{workflowId}/abandon", content: null);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        string body = await response.Content.ReadAsStringAsync();
        Assert.Contains(WorkflowsAdminController.EnvironmentsRegistryUnavailableType, body);
        Assert.DoesNotContain(WorkflowsAdminController.RuntimeGatewayUnavailableType, body);
        Assert.DoesNotContain("internal-host", body);

        (_, string outcome) = AssertAttemptAndOutcomeAudited();
        Assert.Contains("outcome: environments registry unavailable", outcome);
    }

    [Fact]
    public async Task ClientAbortSurfacingAsHttpRequestException_Returns499_AndAuditsCancellation()
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
            .ThrowsAsync(new HttpRequestException("The request was aborted."));

        using var abortedRequest = new CancellationTokenSource();
        await abortedRequest.CancelAsync();
        var httpContext = new DefaultHttpContext { RequestAborted = abortedRequest.Token };
        (WorkflowsAdminController controller, CapturingLoggerProvider logs) = CreateDirectController(httpContext);

        IActionResult result = await controller.ResumeWorkflow(
            Org,
            Env,
            App,
            workflowId,
            cascade: null,
            // The action's own token is bound to RequestAborted at runtime; passing None here proves
            // the classification does not depend on it.
            CancellationToken.None
        );

        var statusCodeResult = Assert.IsType<StatusCodeResult>(result);
        Assert.Equal(499, statusCodeResult.StatusCode);

        (_, string outcome) = AssertAttemptAndOutcomeAudited(AuditMessages(logs));
        Assert.Contains("outcome: canceled by client", outcome);
    }

    [Fact]
    public async Task UnknownEnvironmentOnMutation_Returns404_AndAudits()
    {
        var workflowId = Guid.NewGuid();
        _runtimeGatewayClientMock
            .Setup(client =>
                client.AbandonWorkflowAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<Guid>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new KeyNotFoundException("Environment 'fake-env' not found."));

        using var response = await HttpClient.PostAsync(
            $"{BasePath(env: "fake-env")}/workflows/{workflowId}/abandon",
            content: null
        );

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains(WorkflowsAdminController.EnvironmentNotFoundType, await response.Content.ReadAsStringAsync());

        (_, string outcome) = AssertAttemptAndOutcomeAudited();
        Assert.Contains("outcome: environment not found", outcome);
    }

    [Fact]
    public async Task Mutation_WithoutAntiforgeryToken_IsRejected_WithoutCallingGateway()
    {
        var workflowId = Guid.NewGuid();

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{BasePath()}/workflows/{workflowId}/abandon");
        // A value in the header short-circuits the test handler's token fetch, so the request
        // arrives with a header that has no matching cookie token.
        request.Headers.Add("X-XSRF-TOKEN", "not-a-valid-request-token");

        using var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _runtimeGatewayClientMock.VerifyNoOtherCalls();
        Assert.Empty(AuditMessages());
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
    // The check is defense in depth, not an HTTP contract.
    [Fact]
    public async Task InvalidAppName_Returns400_WithoutCallingGateway()
    {
        (WorkflowsAdminController controller, _) = CreateDirectController();

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

    [Fact]
    public async Task PassThrough_ForwardsDeclaredContentLength()
    {
        byte[] upstreamBody = Encoding.UTF8.GetBytes( /*lang=json,strict*/
            """{"collections":[]}"""
        );
        SetupCollections(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = ByteContent(upstreamBody, "application/json; charset=utf-8"),
            }
        );

        using var response = await HttpClient.GetAsync($"{BasePath()}/collections");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(upstreamBody.Length, response.Content.Headers.ContentLength);
    }

    [Fact]
    public async Task PassThrough_LeavesAnAbsentUpstreamContentTypeAbsent()
    {
        SetupCollections(
            new HttpResponseMessage(HttpStatusCode.OK) { Content = ByteContent(Encoding.UTF8.GetBytes("[]")) }
        );

        using var response = await HttpClient.GetAsync($"{BasePath()}/collections");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null(response.Content.Headers.ContentType);
    }

    [Fact]
    public async Task PassThrough_CopiesBodyBytesVerbatim()
    {
        // A byte that is not valid UTF-8: a decode/re-encode round trip would replace it.
        byte[] upstreamBody = [0x7B, 0x22, 0x61, 0x22, 0x3A, 0x22, 0xFF, 0x22, 0x7D];
        SetupCollections(
            new HttpResponseMessage(HttpStatusCode.OK) { Content = ByteContent(upstreamBody, "application/json") }
        );

        using var response = await HttpClient.GetAsync($"{BasePath()}/collections");

        Assert.Equal(upstreamBody, await response.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task PassThrough_DisposesTheUpstreamResponse_AfterTheResultHasExecuted()
    {
        var upstreamContent = new DisposeTrackingContent(
            Encoding.UTF8.GetBytes( /*lang=json,strict*/
                """{"a":1}"""
            )
        );
        SetupCollections(new HttpResponseMessage(HttpStatusCode.OK) { Content = upstreamContent });

        (WorkflowsAdminController controller, _) = CreateDirectController();
        using var body = new MemoryStream();
        controller.HttpContext.Response.Body = body;

        IActionResult result = await controller.GetCollections(
            Org,
            Env,
            App,
            keys: null,
            failures: null,
            cursor: null,
            pageSize: null,
            CancellationToken.None
        );

        // Ownership moved to the result: the body must still be readable when MVC executes it.
        Assert.False(upstreamContent.IsDisposed);

        await result.ExecuteResultAsync(controller.ControllerContext);

        Assert.True(upstreamContent.IsDisposed);
        Assert.Equal("""{"a":1}""", Encoding.UTF8.GetString(body.ToArray()));
    }

    private void SetupCollections(HttpResponseMessage response) =>
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
            .ReturnsAsync(response);

    private static ByteArrayContent ByteContent(byte[] body, string contentType = null)
    {
        var content = new ByteArrayContent(body);
        content.Headers.ContentType = contentType is null ? null : MediaTypeHeaderValue.Parse(contentType);
        return content;
    }

    private (WorkflowsAdminController Controller, CapturingLoggerProvider Logs) CreateDirectController(
        HttpContext httpContext = null
    )
    {
        var loggerProvider = new CapturingLoggerProvider();
        var loggerFactory = new LoggerFactory([loggerProvider]);
        var controller = new WorkflowsAdminController(
            _runtimeGatewayClientMock.Object,
            loggerFactory.CreateLogger<WorkflowsAdminController>(),
            loggerFactory
        )
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext ?? new DefaultHttpContext() },
        };

        return (controller, loggerProvider);
    }

    private sealed class DisposeTrackingContent : ByteArrayContent
    {
        public DisposeTrackingContent(byte[] content)
            : base(content) { }

        public bool IsDisposed { get; private set; }

        protected override void Dispose(bool disposing)
        {
            IsDisposed = true;
            base.Dispose(disposing);
        }
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

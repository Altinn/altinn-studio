using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http;
using WireMock.Logging;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.EndToEndTests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.EndToEndTests;

/// <summary>
/// End-to-end tests that spin up the full ASP.NET Core application (via WebApplicationFactory),
/// POST real JSON payloads to the engine API, and assert on the final workflow state after the
/// engine has processed the requests.
///
/// Infrastructure:
///   • PostgreSQL  – real Testcontainers instance shared across all tests in this class.
///   • WireMock    – in-process HTTP server that acts as the app-callback / webhook receiver.
///   • Engine      – runs as a hosted background service inside the test host.
///
/// Test isolation: every test calls <see cref="EngineAppFixture.ResetAsync"/> to truncate the
/// database and restore WireMock to its default catch-all 200 stub.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class EngineEndToEndTests(EngineAppFixture fixture) : IAsyncLifetime
{
    // ── Instance-level constants ──────────────────────────────────────────────

    private const string Org = "ttd";
    private const string App = "e2e-tests";
    private const int PartyId = 50001;
    private const string LockToken = "e2e-lock-token-abc123";

    // ── Per-test state ────────────────────────────────────────────────────────

    private EngineApiClient _client = null!;
    private Guid _instanceGuid;

    public async ValueTask InitializeAsync()
    {
        await fixture.ResetAsync();
        _instanceGuid = Guid.NewGuid(); // fresh instance per test → no cross-test interference
        _client = new EngineApiClient(fixture.CreateEngineClient());
    }

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Happy-path tests
    // ═══════════════════════════════════════════════════════════════════════════

    [Theory]
    [InlineData(1, "webhook")]
    [InlineData(3, "app-command")]
    [InlineData(5, "webhook")]
    [InlineData(7, "app-command")]
    public async Task AllStepsComplete_InOrder(int numSteps, string stepType)
    {
        // Arrange
        fixture.WireMock.ResetLogEntries();

        var stubs = Enumerable.Range(1, numSteps).Select(i => $"/{stepType}-{i}").ToList();
        var steps = stepType switch
        {
            "webhook" => stubs.Select(CreateWebhookStep).ToList(),
            "app-command" => stubs.Select(CreateAppCommandStep).ToList(),
            _ => throw new ArgumentOutOfRangeException(nameof(stepType)),
        };
        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, steps), lockToken: LockToken);

        // Act
        var response = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = response.Workflows.Keys.Single();
        var status = await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        Assert.Equal(numSteps, status.Steps.Count);
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));

        var logs = fixture.WireMock.LogEntries;
        Assert.Equal(numSteps, logs.Count);
        Assert.Equal(stubs.Count, logs.Count);

        for (int i = 0; i < stubs.Count; i++)
        {
            Assert.Contains(logs[i].RequestMessage.AbsolutePath, stubs[i], StringComparison.OrdinalIgnoreCase);
        }
    }

    [Theory]
    [InlineData(null, "GET")]
    [InlineData("hello", "POST")]
    public async Task Webhook_UsesCorrectMethod(string? payload, string expectedHttpMethod)
    {
        // Arrange
        fixture.WireMock.ResetLogEntries();

        var step = payload is null ? CreateWebhookStep("/hook-callback") : CreateWebhookStep("/hook-callback", payload);
        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [step]));

        // Act
        var response = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = response.Workflows.Keys.Single();
        var status = await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        Assert.Single(status.Steps);
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Completed, status.Steps[0].Status);

        var logs = fixture.WireMock.LogEntries;
        Assert.Single(logs);
        Assert.Equal(expectedHttpMethod, logs[0].RequestMessage.Method, ignoreCase: true);
        Assert.Contains("/hook-callback", logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AppCommand_UsesCorrectMethod()
    {
        // Arrange
        fixture.WireMock.ResetLogEntries();

        var step = CreateAppCommandStep("/app-command-callback");
        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [step]), lockToken: LockToken);

        // Act
        var response = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = response.Workflows.Keys.Single();
        var status = await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        Assert.Single(status.Steps);
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Completed, status.Steps[0].Status);

        var logs = fixture.WireMock.LogEntries;
        Assert.Single(logs);
        Assert.Equal("POST", logs[0].RequestMessage.Method, ignoreCase: true);
        Assert.Contains(
            "/app-command-callback",
            logs[0].RequestMessage.AbsolutePath,
            StringComparison.OrdinalIgnoreCase
        );
    }

    [Theory]
    [InlineData("webhook")]
    [InlineData("app-command")]
    public async Task StepCommands_RetryOnFailure_ThenCompletes(string stepType)
    {
        // Arrange -- WireMock returns 500 on the first POST, then 200 on the second.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("retry-test")
            .WillSetStateTo("failed-once")
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("retry-test")
            .WhenStateIs("failed-once")
            .RespondWith(Response.Create().WithStatusCode(200));

        var step = stepType switch
        {
            "webhook" => CreateWebhookStep("/hook-callback"),
            "app-command" => CreateAppCommandStep("/app-command-callback"),
            _ => throw new ArgumentOutOfRangeException(nameof(stepType)),
        };

        var request = CreateEnqueueRequest(
            CreateWorkflow("wf", WorkflowType.AppProcessChange, [step]),
            lockToken: LockToken
        );

        // Act
        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Keys.Single();
        var status = await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(2, fixture.WireMock.LogEntries.Count);
    }

    [Theory]
    [InlineData("webhook")]
    [InlineData("app-command")]
    public async Task StepCommand_ExhaustsRetries_WorkflowFails(string stepType)
    {
        // Arrange – WireMock always returns 500 → step exhausts 3 retries → Failed.
        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(500));

        var steps = Enumerable
            .Range(1, 5)
            .Select(i =>
                stepType switch
                {
                    "webhook" => CreateWebhookStep($"/hook-callback-{i}"),
                    "app-command" => CreateAppCommandStep($"/app-command-callback-{i}"),
                    _ => throw new ArgumentOutOfRangeException(nameof(stepType)),
                }
            );

        var request = CreateEnqueueRequest(
            CreateWorkflow("wf", WorkflowType.AppProcessChange, steps),
            lockToken: LockToken
        );

        // Act
        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Keys.Single();
        var status = await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

        // Assert
        Assert.Equal(PersistentItemStatus.Failed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Failed, status.Steps[0].Status);
        Assert.All(status.Steps.Skip(1), s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
    }

    [Fact]
    public async Task Webhook_Post_WithPayload_Completes()
    {
        // Arrange
        const string webhookPath = "/order-callback";
        const string payload = """{"event":"order.completed","orderId":"ORD-42"}""";

        var step = new StepRequest
        {
            Command = new Command.Webhook(
                $"http://localhost:{fixture.WireMock.Port}{webhookPath}",
                Payload: payload,
                ContentType: "application/json"
            ),
        };
        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [step]));

        // Act
        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Keys.Single();
        var status = await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        var logs = fixture.WireMock.LogEntries;
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Single(logs);
        Assert.Contains(webhookPath, logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("POST", logs[0].RequestMessage.Method, ignoreCase: true);
        Assert.Equal(payload, logs[0].RequestMessage.Body);
    }

    // TODO: Add test for overriding the default retry policy.

    // ═══════════════════════════════════════════════════════════════════════════
    // DAG / dependency tests
    // ═══════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task DiamondDag_AllWorkflowsComplete()
    {
        // Diamond: a → b, a → c, b → d, c → d.
        // Each workflow has one Webhook step hitting a dedicated WireMock path.
        var request = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            Workflows =
            [
                CreateWorkflow("a", WorkflowType.Generic, [CreateWebhookStep("/wf-a")]),
                CreateWorkflow("b", WorkflowType.Generic, [CreateWebhookStep("/wf-b")], dependsOn: [(WorkflowRef)"a"]),
                CreateWorkflow("c", WorkflowType.Generic, [CreateWebhookStep("/wf-c")], dependsOn: [(WorkflowRef)"a"]),
                CreateWorkflow(
                    "d",
                    WorkflowType.Generic,
                    [CreateWebhookStep("/wf-d")],
                    dependsOn: [(WorkflowRef)"b", (WorkflowRef)"c"]
                ),
            ],
        };

        // Act
        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        Assert.Equal(4, accepted.Workflows.Count);

        var completedWorkflows = await _client.WaitForAllStatus(
            Org,
            App,
            PartyId,
            _instanceGuid,
            accepted.Workflows.Keys,
            PersistentItemStatus.Completed,
            timeout: TimeSpan.FromSeconds(20)
        );

        // Assert – all four must have completed.
        Assert.Equal(4, completedWorkflows.Count);
        Assert.All(completedWorkflows, wf => Assert.Equal(PersistentItemStatus.Completed, wf.OverallStatus));
    }

    [Fact]
    public async Task LinearChain_AllWorkflowsComplete()
    {
        // A → B → C  (each with a Webhook step)
        var request = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            Workflows =
            [
                CreateWorkflow("a", WorkflowType.Generic, [CreateWebhookStep("/chain-a")]),
                CreateWorkflow(
                    "b",
                    WorkflowType.Generic,
                    [CreateWebhookStep("/chain-b")],
                    dependsOn: [(WorkflowRef)"a"]
                ),
                CreateWorkflow(
                    "c",
                    WorkflowType.Generic,
                    [CreateWebhookStep("/chain-c")],
                    dependsOn: [(WorkflowRef)"b"]
                ),
            ],
        };

        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);

        var completedWorkflows = await _client.WaitForAllStatus(
            Org,
            App,
            PartyId,
            _instanceGuid,
            accepted.Workflows.Keys,
            PersistentItemStatus.Completed,
            timeout: TimeSpan.FromSeconds(20)
        );

        Assert.Equal(3, completedWorkflows.Count);
        Assert.All(completedWorkflows, wf => Assert.Equal(PersistentItemStatus.Completed, wf.OverallStatus));
    }

    [Fact]
    public async Task FailedWorkflow_CascadesDependencyFailed()
    {
        // Arrange – workflow A uses a Webhook that always returns 500 (will eventually fail).
        // Workflow B depends on A by database ID.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/always-fail").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(500));
        // All other requests succeed.
        fixture.SetupDefaultStub();

        // Enqueue A
        var requestA = CreateEnqueueRequest(
            CreateWorkflow("wf-a", WorkflowType.Generic, [CreateWebhookStep("/always-fail")])
        );
        var acceptedA = await _client.Enqueue(Org, App, PartyId, _instanceGuid, requestA);
        var workflowAId = acceptedA.Workflows.Keys.Single();

        // Enqueue B depending on A by its persisted ID.
        var requestB = CreateEnqueueRequest(
            CreateWorkflow(
                "wf-b",
                WorkflowType.Generic,
                [CreateWebhookStep("/always-succeed")],
                dependsOn: [(WorkflowRef)workflowAId]
            )
        );
        var acceptedB = await _client.Enqueue(Org, App, PartyId, _instanceGuid, requestB);
        var workflowBId = acceptedB.Workflows.Keys.Single();

        // Act – wait for A to fail (retries exhaust in ~1 s; budget = 20 s).
        var failedA = await _client.WaitForStatus(
            Org,
            App,
            PartyId,
            _instanceGuid,
            workflowAId,
            PersistentItemStatus.Failed,
            timeout: TimeSpan.FromSeconds(20)
        );
        Assert.Equal(PersistentItemStatus.Failed, failedA.OverallStatus);

        // B must cascade to DependencyFailed.
        var dependencyFailedB = await _client.WaitForStatus(
            Org,
            App,
            PartyId,
            _instanceGuid,
            workflowBId,
            PersistentItemStatus.DependencyFailed,
            timeout: TimeSpan.FromSeconds(10)
        );

        // Assert
        Assert.Equal(PersistentItemStatus.DependencyFailed, dependencyFailedB.OverallStatus);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // API-level validation tests
    // ═══════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task AppCommand_WithoutLockToken_Returns400_AndNothingEnqueued()
    {
        var request = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            LockToken = null,
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf",
                    OperationId = $"op-{Guid.NewGuid()}",
                    Type = WorkflowType.AppProcessChange,
                    Steps = [new StepRequest { Command = new Command.AppCommand("do-something") }],
                },
            ],
        };

        using var response = await _client.EnqueueRaw(Org, App, PartyId, _instanceGuid, request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        // Nothing should have been stored.
        var active = await _client.ListActiveWorkflows(Org, App, PartyId, _instanceGuid);
        Assert.Empty(active);
    }

    [Fact]
    public async Task NoApiKey_Returns401()
    {
        // Use a plain HttpClient without the API key header.
        using var unauthenticatedClient = fixture.CreateEngineClient();
        unauthenticatedClient.DefaultRequestHeaders.Remove("X-API-Key");

        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [CreateWebhookStep("/ping-1")]));

        using var response = await unauthenticatedClient.PostAsJsonAsync(
            $"/api/v1/workflows/{Org}/{App}/{PartyId}/{_instanceGuid}",
            request
        );

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ConcurrencyConstraint_SecondAppProcessChangeRejectedWith409()
    {
        // Arrange – A uses a Webhook that WireMock delays for 30 s so A stays in Processing
        // long enough for B's constraint check to see it.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/slow").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(30)));
        fixture.SetupDefaultStub();

        var requestA = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            LockToken = LockToken,
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-a",
                    OperationId = $"op-a-{Guid.NewGuid()}",
                    Type = WorkflowType.AppProcessChange,
                    Steps =
                    [
                        new StepRequest
                        {
                            Command = new Command.Webhook($"http://localhost:{fixture.WireMock.Port}/slow"),
                        },
                    ],
                },
            ],
        };

        var acceptedA = await _client.Enqueue(Org, App, PartyId, _instanceGuid, requestA);
        Assert.Single(acceptedA.Workflows);

        // B has no dependency on A → constraint check must reject it.
        var requestB = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            LockToken = LockToken,
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf-b",
                    OperationId = $"op-b-{Guid.NewGuid()}",
                    Type = WorkflowType.AppProcessChange,
                    Steps = [CreateWebhookStep("/quick")],
                },
            ],
        };

        using var responseB = await _client.EnqueueRaw(Org, App, PartyId, _instanceGuid, requestB);

        Assert.Equal(HttpStatusCode.Conflict, responseB.StatusCode);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Query / read-model tests
    // ═══════════════════════════════════════════════════════════════════════════

    [Fact]
    public async Task GetWorkflow_AfterCompletion_ReturnsFullDetails()
    {
        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [CreateWebhookStep("/ping-2")]));

        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Keys.Single();

        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var workflow = await _client.GetWorkflow(Org, App, PartyId, _instanceGuid, workflowId);

        Assert.NotNull(workflow);
        Assert.Equal(workflowId, workflow.DatabaseId);
        Assert.Equal(PersistentItemStatus.Completed, workflow.OverallStatus);
        Assert.Equal(WorkflowType.Generic, workflow.Type);
        Assert.NotNull(workflow.UpdatedAt);
        Assert.Single(workflow.Steps);
        Assert.Equal(PersistentItemStatus.Completed, workflow.Steps[0].Status);
    }

    [Fact]
    public async Task GetWorkflow_WrongInstance_Returns404()
    {
        // Arrange
        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [CreateWebhookStep("/ping-3")]));

        // Act
        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Keys.Single();
        await WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Query from a completely different instance GUID.
        var otherGuid = Guid.NewGuid();
        var result = await _client.GetWorkflow(Org, App, PartyId, otherGuid, workflowId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task ListActiveWorkflows_ReturnsWorkflowWhileStillProcessing()
    {
        // Use a 10 s WireMock delay so the step stays in Processing while we list.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/slow-list").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(10)));
        fixture.SetupDefaultStub();

        var request = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf",
                    OperationId = $"op-{Guid.NewGuid()}",
                    Type = WorkflowType.Generic,
                    Steps =
                    [
                        new StepRequest
                        {
                            Command = new Command.Webhook($"http://localhost:{fixture.WireMock.Port}/slow-list"),
                        },
                    ],
                },
            ],
        };

        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Keys.Single();

        // Poll until the engine picks up the workflow (Enqueued or Processing).
        var deadline = DateTimeOffset.UtcNow.AddSeconds(10);
        List<WorkflowStatusResponse> active;
        do
        {
            active = await _client.ListActiveWorkflows(Org, App, PartyId, _instanceGuid);
            if (active.Count > 0)
                break;
            await Task.Delay(100);
        } while (DateTimeOffset.UtcNow < deadline);

        Assert.NotEmpty(active);
        Assert.Single(active);
        Assert.Equal(workflowId, active[0].DatabaseId);
    }

    [Fact]
    public async Task ListActiveWorkflows_ReturnsNoContent_AfterCompletion()
    {
        var request = CreateEnqueueRequest(CreateWorkflow("wf", WorkflowType.Generic, [CreateWebhookStep("/ping-4")]));

        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Keys.Single();

        await _client.WaitForStatus(Org, App, PartyId, _instanceGuid, workflowId, PersistentItemStatus.Completed);

        // After completion the workflow is no longer "active".
        var active = await _client.ListActiveWorkflows(Org, App, PartyId, _instanceGuid);
        Assert.Empty(active);
    }

    [Fact]
    public async Task ScheduledWorkflow_StartsAfterStartAt()
    {
        // Arrange – enqueue with StartAt 3 s in the future.
        var startAt = DateTimeOffset.UtcNow.AddSeconds(3);

        var request = new WorkflowEnqueueRequest
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "wf",
                    OperationId = $"op-{Guid.NewGuid()}",
                    Type = WorkflowType.Generic,
                    StartAt = startAt,
                    Steps = [CreateWebhookStep("/scheduled")],
                },
            ],
        };

        var accepted = await _client.Enqueue(Org, App, PartyId, _instanceGuid, request);
        var workflowId = accepted.Workflows.Keys.Single();

        // Act – just after enqueue the workflow should NOT yet appear as active.
        var earlyActive = await _client.ListActiveWorkflows(Org, App, PartyId, _instanceGuid);
        Assert.Empty(earlyActive);

        // After the start time has passed the workflow should complete normally.
        var completed = await _client.WaitForStatus(
            Org,
            App,
            PartyId,
            _instanceGuid,
            workflowId,
            PersistentItemStatus.Completed,
            timeout: TimeSpan.FromSeconds(15)
        );
        Assert.Equal(PersistentItemStatus.Completed, completed.OverallStatus);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Factory helpers
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Creates a GET Webhook step pointing at <c>http://localhost:{wireMockPort}{path}</c>.
    /// </summary>
    private StepRequest CreateWebhookStep(string path) =>
        new() { Command = new Command.Webhook($"http://localhost:{fixture.WireMock.Port}{path}") };

    /// <summary>
    /// Creates a POST Webhook step pointing at <c>http://localhost:{wireMockPort}{path}</c>.
    /// </summary>
    private StepRequest CreateWebhookStep(string path, string payload) =>
        new() { Command = new Command.Webhook($"http://localhost:{fixture.WireMock.Port}{path}", payload) };

    /// <summary>
    /// Creates an AppCommand step with the given command.
    /// </summary>
    private static StepRequest CreateAppCommandStep(string command) =>
        new() { Command = new Command.AppCommand(command) };

    /// <summary>Builds a <see cref="WorkflowRequest"/> with the supplied steps.</summary>
    private static WorkflowRequest CreateWorkflow(
        string wfRef,
        WorkflowType type,
        IEnumerable<StepRequest> steps,
        IEnumerable<WorkflowRef>? dependsOn = null
    ) =>
        new()
        {
            Ref = wfRef,
            OperationId = $"op-{wfRef}-{Guid.NewGuid()}",
            Type = type,
            Steps = steps.ToArray(),
            DependsOn = dependsOn?.ToList(),
        };

    /// <summary>
    /// Wraps a single <see cref="WorkflowRequest"/> in a <see cref="WorkflowEnqueueRequest"/>.
    /// </summary>
    private static WorkflowEnqueueRequest CreateEnqueueRequest(WorkflowRequest workflow, string? lockToken = null) =>
        new()
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            LockToken = lockToken,
            Workflows = [workflow],
        };

    private async Task<WorkflowStatusResponse> WaitForWorkflowStatus(long workflowId, PersistentItemStatus status) =>
        await _client.WaitForStatus(
            Org,
            App,
            PartyId,
            _instanceGuid,
            workflowId,
            status,
            cancellationToken: TestContext.Current.CancellationToken
        );
}

using System.Text.Json;
using WireMock;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Theory]
    [InlineData(1)]
    [InlineData(5)]
    public async Task AllStepsComplete_InOrder(int numSteps)
    {
        // Arrange
        var stubs = Enumerable.Range(1, numSteps).Select(i => $"/webhook-{i}").ToList();
        var steps = stubs.Select(x => _testHelpers.CreateWebhookStep(x)).ToList();
        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", steps));

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        Assert.Equal(numSteps, status.Steps.Count);
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));

        var logs = fixture.WireMock.LogEntries;
        Assert.Equal(numSteps, logs.Count);
        Assert.Equal(stubs.Count, logs.Count);
        await _testHelpers.AssertDbWorkflowCount(1);
        await _testHelpers.AssertDbStepCount(numSteps);

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
        var step = payload is null
            ? _testHelpers.CreateWebhookStep("/hook-callback")
            : _testHelpers.CreateWebhookStep("/hook-callback", payload);
        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", [step]));

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

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
    public async Task StepCommands_RetryOnFailure_ThenCompletes()
    {
        // Arrange -- WireMock returns 500 on the first POST, then 200 on the second.
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

        var step = _testHelpers.CreateWebhookStep("/hook-callback");

        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", [step]));

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(2, fixture.WireMock.LogEntries.Count);
    }

    [Fact]
    public async Task StepCommand_ExhaustsRetries_WorkflowFails()
    {
        // Arrange – WireMock always returns 500 → step exhausts 3 retries → Failed.
        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(500));

        var steps = Enumerable.Range(1, 5).Select(i => _testHelpers.CreateWebhookStep($"/hook-callback-{i}"));

        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", steps));

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

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
            OperationId = webhookPath,
            Command = new CommandDefinition
            {
                Type = "webhook",
                Data = JsonSerializer.SerializeToElement(
                    new
                    {
                        uri = $"http://localhost:{fixture.WireMock.Port}{webhookPath}",
                        payload,
                        contentType = "application/json",
                    }
                ),
            },
        };
        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", [step]));

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        var logs = fixture.WireMock.LogEntries;
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Single(logs);
        Assert.Contains(webhookPath, logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("POST", logs[0].RequestMessage.Method, ignoreCase: true);
        Assert.Equal(payload, logs[0].RequestMessage.Body);
    }

    [Fact]
    public async Task StepCommand_UsesMaxExecutionTime_CanOverrideRetryPolicy()
    {
        // Arrange
        var requestReceived = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        string? requestPath = null;

        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .RespondWith(
                Response
                    .Create()
                    .WithCallback(req =>
                    {
                        requestPath = req.AbsolutePath;
                        requestReceived.TrySetResult(true);
                        return new ResponseMessage { StatusCode = 200 };
                    })
                    .WithDelay(TimeSpan.FromSeconds(1))
            );

        var step = _testHelpers.CreateWebhookStep(
            "/webhook-callback",
            maxExecutionTime: TimeSpan.FromSeconds(0.5),
            retryStrategy: RetryStrategy.None()
        );

        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", [step]));

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

        // Assert
        Assert.Equal(PersistentItemStatus.Failed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Failed, status.Steps[0].Status);

        await requestReceived.Task.WaitAsync(TimeSpan.FromSeconds(1), TestContext.Current.CancellationToken);

        Assert.NotNull(requestPath);
        Assert.Contains("/webhook-callback", requestPath, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DiamondDag_AllWorkflowsComplete()
    {
        // Arrange
        // A → B, A → C, B + C → D
        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/hook-a")]),
            _testHelpers.CreateWorkflow("b", [_testHelpers.CreateWebhookStep("/hook-b")], dependsOn: ["a"]),
            _testHelpers.CreateWorkflow("c", [_testHelpers.CreateWebhookStep("/hook-c")], dependsOn: ["a"]),
            _testHelpers.CreateWorkflow("d", [_testHelpers.CreateWebhookStep("/hook-d")], dependsOn: ["b", "c"]),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        var statuses = await _client.WaitForWorkflowStatus(
            response.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );

        // Assert
        Assert.Equal(4, response.Workflows.Count);
        Assert.Equal(4, statuses.Count);
        Assert.All(statuses, wf => Assert.Equal(PersistentItemStatus.Completed, wf.OverallStatus));

        await _testHelpers.AssertDbWorkflowCount(4);
        await _testHelpers.AssertDbStepCount(4);

        var logs = fixture.WireMock.LogEntries;
        Assert.Equal(4, logs.Count);
        Assert.Contains("/hook-a", logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("/hook-d", logs[3].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task LinearChain_AllWorkflowsComplete()
    {
        // Arrange
        // A → B → C
        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/hook-a")]),
            _testHelpers.CreateWorkflow("b", [_testHelpers.CreateWebhookStep("/hook-b")], dependsOn: ["a"]),
            _testHelpers.CreateWorkflow("c", [_testHelpers.CreateWebhookStep("/hook-c")], dependsOn: ["b"]),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        var statuses = await _client.WaitForWorkflowStatus(
            response.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );

        // Assert
        Assert.Equal(3, response.Workflows.Count);
        Assert.Equal(3, statuses.Count);
        Assert.All(statuses, wf => Assert.Equal(PersistentItemStatus.Completed, wf.OverallStatus));

        await _testHelpers.AssertDbWorkflowCount(3);
        await _testHelpers.AssertDbStepCount(3);

        var logs = fixture.WireMock.LogEntries;
        Assert.Equal(3, logs.Count);
        Assert.Contains("/hook-a", logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("/hook-b", logs[1].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("/hook-c", logs[2].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task FailedWorkflow_CascadesDependencyFailed()
    {
        // Arrange
        // Workflow A uses a webhook that always returns 500 and will eventually fail.
        // Workflow B depends on A by database ID.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/always-fail").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture.SetupDefaultStub();

        var workflowA = _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/always-fail")]);
        var workflowB = _testHelpers.CreateWorkflow("wf-b", [_testHelpers.CreateWebhookStep("/always-succeed")]);

        // Act
        var requestA = _testHelpers.CreateEnqueueRequest(workflowA);
        var responseA = await _client.Enqueue(requestA);
        var workflowAIdA = responseA.Workflows.Single().DatabaseId;

        var requestB = _testHelpers.CreateEnqueueRequest(workflowB with { DependsOn = [workflowAIdA] });
        var responseB = await _client.Enqueue(requestB);
        var workflowIdB = responseB.Workflows.Single().DatabaseId;

        var statusA = await _client.WaitForWorkflowStatus(workflowAIdA, PersistentItemStatus.Failed);
        var statusB = await _client.WaitForWorkflowStatus(workflowIdB, PersistentItemStatus.DependencyFailed);

        // Assert
        Assert.Equal(PersistentItemStatus.Failed, statusA.OverallStatus);
        Assert.Equal(PersistentItemStatus.DependencyFailed, statusB.OverallStatus);

        // Steps on the dependency-failed workflow should remain Enqueued (not touched)
        Assert.All(statusB.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));

        await _testHelpers.AssertDbWorkflowCount(2);
        await _testHelpers.AssertDbStepCount(2);

        var logs = fixture.WireMock.LogEntries;
        Assert.Contains(
            logs,
            log => log.RequestMessage.AbsolutePath.Contains("/always-fail", StringComparison.OrdinalIgnoreCase)
        );
        Assert.DoesNotContain(
            logs,
            log => log.RequestMessage.AbsolutePath.Contains("/always-succeed", StringComparison.OrdinalIgnoreCase)
        );
    }

    [Fact]
    public async Task FailedWorkflow_CascadesMultiLevel_A_B_C()
    {
        // Arrange — A → B → C, A fails → B gets DependencyFailed → C gets DependencyFailed
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/always-fail").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture.SetupDefaultStub();

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/always-fail")]),
            _testHelpers.CreateWorkflow("b", [_testHelpers.CreateWebhookStep("/hook-b")], dependsOn: ["a"]),
            _testHelpers.CreateWorkflow("c", [_testHelpers.CreateWebhookStep("/hook-c")], dependsOn: ["b"]),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        var ids = response.Workflows.ToDictionary(w => w.Ref!, w => w.DatabaseId);

        var statusA = await _client.WaitForWorkflowStatus(ids["a"], PersistentItemStatus.Failed);
        var statusB = await _client.WaitForWorkflowStatus(ids["b"], PersistentItemStatus.DependencyFailed);
        var statusC = await _client.WaitForWorkflowStatus(ids["c"], PersistentItemStatus.DependencyFailed);

        // Assert
        Assert.Equal(PersistentItemStatus.Failed, statusA.OverallStatus);
        Assert.Equal(PersistentItemStatus.DependencyFailed, statusB.OverallStatus);
        Assert.Equal(PersistentItemStatus.DependencyFailed, statusC.OverallStatus);

        // Steps on dependency-failed workflows should remain Enqueued
        Assert.All(statusB.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
        Assert.All(statusC.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));

        // Only A's webhook should have been called
        var logs = fixture.WireMock.LogEntries;
        Assert.DoesNotContain(
            logs,
            log => log.RequestMessage.AbsolutePath.Contains("/hook-b", StringComparison.OrdinalIgnoreCase)
        );
        Assert.DoesNotContain(
            logs,
            log => log.RequestMessage.AbsolutePath.Contains("/hook-c", StringComparison.OrdinalIgnoreCase)
        );
    }

    [Fact]
    public async Task FailedWorkflow_FanOut_AllDependentsGetDependencyFailed()
    {
        // Arrange — A fails, B and C both depend on A → both get DependencyFailed
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/always-fail").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture.SetupDefaultStub();

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/always-fail")]),
            _testHelpers.CreateWorkflow("b", [_testHelpers.CreateWebhookStep("/hook-b")], dependsOn: ["a"]),
            _testHelpers.CreateWorkflow("c", [_testHelpers.CreateWebhookStep("/hook-c")], dependsOn: ["a"]),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        var ids = response.Workflows.ToDictionary(w => w.Ref!, w => w.DatabaseId);

        var statusA = await _client.WaitForWorkflowStatus(ids["a"], PersistentItemStatus.Failed);
        var statusB = await _client.WaitForWorkflowStatus(ids["b"], PersistentItemStatus.DependencyFailed);
        var statusC = await _client.WaitForWorkflowStatus(ids["c"], PersistentItemStatus.DependencyFailed);

        // Assert
        Assert.Equal(PersistentItemStatus.Failed, statusA.OverallStatus);
        Assert.Equal(PersistentItemStatus.DependencyFailed, statusB.OverallStatus);
        Assert.Equal(PersistentItemStatus.DependencyFailed, statusC.OverallStatus);

        Assert.All(statusB.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
        Assert.All(statusC.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
    }

    [Fact]
    public async Task FailedWorkflow_FanIn_OneFailedDependency_CascadesDependencyFailed()
    {
        // Arrange — B depends on both A1 (succeeds) and A2 (fails) → B gets DependencyFailed
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/always-fail").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture.SetupDefaultStub();

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a1", [_testHelpers.CreateWebhookStep("/hook-a1")]),
            _testHelpers.CreateWorkflow("a2", [_testHelpers.CreateWebhookStep("/always-fail")]),
            _testHelpers.CreateWorkflow("b", [_testHelpers.CreateWebhookStep("/hook-b")], dependsOn: ["a1", "a2"]),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        var ids = response.Workflows.ToDictionary(w => w.Ref!, w => w.DatabaseId);

        var statusA1 = await _client.WaitForWorkflowStatus(ids["a1"], PersistentItemStatus.Completed);
        var statusA2 = await _client.WaitForWorkflowStatus(ids["a2"], PersistentItemStatus.Failed);
        var statusB = await _client.WaitForWorkflowStatus(ids["b"], PersistentItemStatus.DependencyFailed);

        // Assert
        Assert.Equal(PersistentItemStatus.Completed, statusA1.OverallStatus);
        Assert.Equal(PersistentItemStatus.Failed, statusA2.OverallStatus);
        Assert.Equal(PersistentItemStatus.DependencyFailed, statusB.OverallStatus);

        Assert.All(statusB.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
    }

    [Fact]
    public async Task DiamondDag_RootFails_AllDescendantsGetDependencyFailed()
    {
        // Arrange — Diamond: A → B, A → C, B + C → D. A fails → all descendants DependencyFailed.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/always-fail").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture.SetupDefaultStub();

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/always-fail")]),
            _testHelpers.CreateWorkflow("b", [_testHelpers.CreateWebhookStep("/hook-b")], dependsOn: ["a"]),
            _testHelpers.CreateWorkflow("c", [_testHelpers.CreateWebhookStep("/hook-c")], dependsOn: ["a"]),
            _testHelpers.CreateWorkflow("d", [_testHelpers.CreateWebhookStep("/hook-d")], dependsOn: ["b", "c"]),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        var ids = response.Workflows.ToDictionary(w => w.Ref!, w => w.DatabaseId);

        var statusA = await _client.WaitForWorkflowStatus(ids["a"], PersistentItemStatus.Failed);
        var statusB = await _client.WaitForWorkflowStatus(ids["b"], PersistentItemStatus.DependencyFailed);
        var statusC = await _client.WaitForWorkflowStatus(ids["c"], PersistentItemStatus.DependencyFailed);
        var statusD = await _client.WaitForWorkflowStatus(ids["d"], PersistentItemStatus.DependencyFailed);

        // Assert
        Assert.Equal(PersistentItemStatus.Failed, statusA.OverallStatus);
        Assert.Equal(PersistentItemStatus.DependencyFailed, statusB.OverallStatus);
        Assert.Equal(PersistentItemStatus.DependencyFailed, statusC.OverallStatus);
        Assert.Equal(PersistentItemStatus.DependencyFailed, statusD.OverallStatus);

        Assert.All(statusB.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
        Assert.All(statusC.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
        Assert.All(statusD.Steps, s => Assert.Equal(PersistentItemStatus.Enqueued, s.Status));
    }

    [Fact]
    public async Task MultiStepWorkflow_StepFails_RemainingStepsStayEnqueued()
    {
        // Arrange — 3-step workflow where step 1 (index 0) always fails.
        // Steps 2 and 3 should remain Enqueued.
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/always-fail").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture.SetupDefaultStub();

        var steps = new[]
        {
            _testHelpers.CreateWebhookStep("/always-fail"),
            _testHelpers.CreateWebhookStep("/hook-2"),
            _testHelpers.CreateWebhookStep("/hook-3"),
        };
        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", steps));

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

        // Assert
        Assert.Equal(PersistentItemStatus.Failed, status.OverallStatus);
        Assert.Equal(3, status.Steps.Count);
        Assert.Equal(PersistentItemStatus.Failed, status.Steps[0].Status);
        Assert.Equal(PersistentItemStatus.Enqueued, status.Steps[1].Status);
        Assert.Equal(PersistentItemStatus.Enqueued, status.Steps[2].Status);
    }
}

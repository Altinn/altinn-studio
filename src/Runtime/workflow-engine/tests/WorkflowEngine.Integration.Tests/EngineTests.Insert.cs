using System.Text.Json;
using WireMock;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.TestKit;

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
}

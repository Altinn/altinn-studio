using WireMock;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Theory]
    [InlineData(1, "webhook")]
    [InlineData(3, "app-command")]
    [InlineData(5, "webhook")]
    [InlineData(7, "app-command")]
    public async Task AllStepsComplete_InOrder(int numSteps, string stepType)
    {
        // Arrange
        var stubs = Enumerable.Range(1, numSteps).Select(i => $"/{stepType}-{i}").ToList();
        var steps = stepType switch
        {
            "webhook" => stubs.Select(x => _testHelpers.CreateWebhookStep(x)).ToList(),
            "app-command" => stubs.Select(x => _testHelpers.CreateAppCommandStep(x)).ToList(),
            _ => throw new ArgumentOutOfRangeException(nameof(stepType)),
        };
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.Generic, steps),
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

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
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.Generic, [step])
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

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
        var step = _testHelpers.CreateAppCommandStep("/app-command-callback");
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.Generic, [step]),
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

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
            "webhook" => _testHelpers.CreateWebhookStep("/hook-callback"),
            "app-command" => _testHelpers.CreateAppCommandStep("/app-command-callback"),
            _ => throw new ArgumentOutOfRangeException(nameof(stepType)),
        };

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.AppProcessChange, [step]),
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

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
                    "webhook" => _testHelpers.CreateWebhookStep($"/hook-callback-{i}"),
                    "app-command" => _testHelpers.CreateAppCommandStep($"/app-command-callback-{i}"),
                    _ => throw new InvalidOperationException(),
                }
            );

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.AppProcessChange, steps),
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Failed);

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
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.Generic, [step])
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        // Assert
        var logs = fixture.WireMock.LogEntries;
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Single(logs);
        Assert.Contains(webhookPath, logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("POST", logs[0].RequestMessage.Method, ignoreCase: true);
        Assert.Equal(payload, logs[0].RequestMessage.Body);
    }

    [Theory]
    [InlineData("webhook")]
    [InlineData("app-command")]
    public async Task StepCommand_UsesMaxExecutionTime_CanOverrideRetryPolicy(string stepType)
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

        var step = stepType switch
        {
            "webhook" => _testHelpers.CreateWebhookStep(
                $"/{stepType}-callback",
                maxExecutionTime: TimeSpan.FromSeconds(0.5),
                retryStrategy: RetryStrategy.None()
            ),
            "app-command" => _testHelpers.CreateAppCommandStep(
                $"/{stepType}-callback",
                maxExecutionTime: TimeSpan.FromSeconds(0.5),
                retryStrategy: RetryStrategy.None()
            ),
            _ => throw new InvalidOperationException(),
        };

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", WorkflowType.AppProcessChange, [step]),
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Failed);

        // Assert
        Assert.Equal(PersistentItemStatus.Failed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Failed, status.Steps[0].Status);

        await requestReceived.Task.WaitAsync(TimeSpan.FromSeconds(1), TestContext.Current.CancellationToken);

        Assert.NotNull(requestPath);
        Assert.Contains($"/{stepType}-callback", requestPath, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DiamondDag_AllWorkflowsComplete()
    {
        // Arrange
        // A → B, A → C, B + C → D
        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", WorkflowType.Generic, [_testHelpers.CreateWebhookStep("/hook-a")]),
            _testHelpers.CreateWorkflow(
                "b",
                WorkflowType.Generic,
                [_testHelpers.CreateWebhookStep("/hook-b")],
                dependsOn: ["a"]
            ),
            _testHelpers.CreateWorkflow(
                "c",
                WorkflowType.Generic,
                [_testHelpers.CreateWebhookStep("/hook-c")],
                dependsOn: ["a"]
            ),
            _testHelpers.CreateWorkflow(
                "d",
                WorkflowType.Generic,
                [_testHelpers.CreateWebhookStep("/hook-d")],
                dependsOn: ["b", "c"]
            ),
        ]);

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var statuses = await _client.WaitForWorkflowStatus(
            _instanceGuid,
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
            _testHelpers.CreateWorkflow("a", WorkflowType.Generic, [_testHelpers.CreateWebhookStep("/hook-a")]),
            _testHelpers.CreateWorkflow(
                "b",
                WorkflowType.Generic,
                [_testHelpers.CreateWebhookStep("/hook-b")],
                dependsOn: ["a"]
            ),
            _testHelpers.CreateWorkflow(
                "c",
                WorkflowType.Generic,
                [_testHelpers.CreateWebhookStep("/hook-c")],
                dependsOn: ["b"]
            ),
        ]);

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var statuses = await _client.WaitForWorkflowStatus(
            _instanceGuid,
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

        var workflowA = _testHelpers.CreateWorkflow(
            "wf-a",
            WorkflowType.Generic,
            [_testHelpers.CreateWebhookStep("/always-fail")]
        );
        var workflowB = _testHelpers.CreateWorkflow(
            "wf-b",
            WorkflowType.Generic,
            [_testHelpers.CreateWebhookStep("/always-succeed")]
        );

        // Act
        var requestA = _testHelpers.CreateEnqueueRequest(workflowA);
        var responseA = await _client.Enqueue(_instanceGuid, requestA);
        var workflowAIdA = responseA.Workflows.Single().DatabaseId;

        var requestB = _testHelpers.CreateEnqueueRequest(workflowB with { DependsOn = [workflowAIdA] });
        var responseB = await _client.Enqueue(_instanceGuid, requestB);
        var workflowIdB = responseB.Workflows.Single().DatabaseId;

        var statusA = await _client.WaitForWorkflowStatus(_instanceGuid, workflowAIdA, PersistentItemStatus.Failed);
        var statusB = await _client.WaitForWorkflowStatus(
            _instanceGuid,
            workflowIdB,
            PersistentItemStatus.DependencyFailed
        );

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

    [Fact]
    public async Task ComplexDag_RawJson_AllWorkflowsComplete()
    {
        // Arrange
        /*
                                      [wf-root]
                                          |
                  ┌───────────────────────┼───────────────────────┐
                  |                       |                       |
            [wf-a-first]            [wf-b-first]            [wf-c-first]
                  |                       |                       |
            [wf-a-second]                 └───────────┬───────────┘
                  |                                   |
            [wf-a-third]                        [wf-join-b-c]
                  |                                   |
                  └──────────────────┬────────────────┘
                                     |
                               [wf-join-all]
         */

        const string request = $$"""
            {
                "actor": {
                    "userIdOrOrgNumber": "{{EngineAppFixture.DefaultPartyId}}",
                    "language": "nb"
                },
                "idempotencyKey": "complex-dag-raw-json",
                "lockToken": "{{InstanceLockToken}}",
                "workflows": [
                    {
                        "ref": "wf-root",
                        "operationId": "process-root",
                        "type": "Generic",
                        "steps": [
                            {
                                "command": {
                                    "type": "app",
                                    "commandKey": "process-root"
                                }
                            }
                        ]
                    },
                    {
                        "ref": "wf-a-first",
                        "operationId": "process-a-1",
                        "type": "Generic",
                        "dependsOn": [
                            "wf-root"
                        ],
                        "steps": [
                            {
                                "command": {
                                    "type": "app",
                                    "commandKey": "process-a-1"
                                }
                            }
                        ]
                    },
                    {
                        "ref": "wf-a-second",
                        "operationId": "process-a-2",
                        "type": "Generic",
                        "dependsOn": [
                            "wf-a-first"
                        ],
                        "steps": [
                            {
                                "command": {
                                    "type": "app",
                                    "commandKey": "process-a-2"
                                }
                            }
                        ]
                    },
                    {
                        "ref": "wf-a-third",
                        "operationId": "process-a-3",
                        "type": "Generic",
                        "dependsOn": [
                            "wf-a-second"
                        ],
                        "steps": [
                            {
                                "command": {
                                    "type": "app",
                                    "commandKey": "process-a-3"
                                }
                            }
                        ]
                    },
                    {
                        "ref": "wf-b-first",
                        "operationId": "process-b-1",
                        "type": "Generic",
                        "dependsOn": [
                            "wf-root"
                        ],
                        "steps": [
                            {
                                "command": {
                                    "type": "app",
                                    "commandKey": "process-b-1"
                                }
                            }
                        ]
                    },
                    {
                        "ref": "wf-c-first",
                        "operationId": "process-c-1",
                        "type": "Generic",
                        "dependsOn": [
                            "wf-root"
                        ],
                        "steps": [
                            {
                                "command": {
                                    "type": "app",
                                    "commandKey": "process-c-1"
                                }
                            }
                        ]
                    },
                    {
                        "ref": "wf-join-2-3",
                        "operationId": "process-join-2-3",
                        "type": "Generic",
                        "dependsOn": [
                            "wf-b-first",
                            "wf-c-first"
                        ],
                        "steps": [
                            {
                                "command": {
                                    "type": "app",
                                    "commandKey": "process-join-2-3"
                                }
                            }
                        ]
                    },
                    {
                        "ref": "wf-join-all",
                        "operationId": "process-join-all",
                        "type": "AppProcessChange",
                        "dependsOn": [
                            "wf-a-third",
                            "wf-join-2-3"
                        ],
                        "steps": [
                            {
                                "command": {
                                    "type": "app",
                                    "commandKey": "process-join-all-1"
                                }
                            },
                            {
                                "command": {
                                    "type": "app",
                                    "commandKey": "process-join-all-2"
                                }
                            }
                        ]
                    }
                ]
            }
            """;

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var statuses = await _client.WaitForWorkflowStatus(
            _instanceGuid,
            response.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );

        // Assert
        Assert.Equal(8, response.Workflows.Count);
        Assert.Equal(8, statuses.Count);
        Assert.All(statuses, wf => Assert.Equal(PersistentItemStatus.Completed, wf.OverallStatus));
        Assert.All(statuses, wf => Assert.All(wf.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status)));

        await _testHelpers.AssertDbWorkflowCount(8);
        await _testHelpers.AssertDbStepCount(9); // The last workflow has two steps

        var logs = fixture.WireMock.LogEntries;
        Assert.Equal(9, logs.Count); // The last workflow has two steps

        Assert.Contains("/process-root", logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("/process-join-all-1", logs[7].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("/process-join-all-2", logs[8].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
    }
}

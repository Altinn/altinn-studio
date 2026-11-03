using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using WireMock;
using WireMock.Matchers;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Types;
using WireMock.Util;
using WorkflowEngine.Models;
using WorkflowEngine.Operator.Commands.OperatorCommand;
using WorkflowEngine.Operator.Tests.Fixtures;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Operator.Tests.Integration;

/// <summary>
/// Runs a core operator run workflow through the engine's HTTP API, with PostgreSQL in a container and WireMock in
/// the role of the operator's callback router.
/// </summary>
[Collection(OperatorTestCollection.Name)]
public sealed class OperatorRunWorkflowTests(OperatorTestFixture fixture) : IAsyncLifetime
{
    private const string Namespace = "runs-assistant";
    private const string RunId = "4e1f6a52-5f0b-5d3e-9a4b-2c7d8e9f0a1b";

    private static readonly string[] _runSteps =
    [
        "run.admit",
        "run.create-job",
        "run.await-pod",
        "run.await-archive",
        "run.await-result",
        "run.cleanup",
    ];

    private readonly EngineApiClient _client = new(fixture, Namespace);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    [Fact]
    public async Task RunWorkflow_StepsDeferThenComplete_CallsEveryStepInOrder()
    {
        // Arrange
        var operatorCalls = StubOperator(deferrals: new() { ["run.admit"] = 1, ["run.await-result"] = 2 });

        // Act
        using var response = await _client.EnqueueRaw(CreateRunRequest(), Namespace, "assistant:upgrade-1");
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var accepted = await response.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>(
            TestContext.Current.CancellationToken
        );
        var workflowId = Assert.Single(accepted!.Workflows).DatabaseId;
        var status = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Completed,
            TimeSpan.FromSeconds(60)
        );

        // Assert
        Assert.All(status.Steps, step => Assert.Equal(PersistentItemStatus.Completed, step.Status));
        string[] expectedCalls =
        [
            "run.admit",
            "run.admit",
            "run.create-job",
            "run.await-pod",
            "run.await-archive",
            "run.await-result",
            "run.await-result",
            "run.await-result",
            "run.cleanup",
        ];
        Assert.Equal(expectedCalls, operatorCalls.Select(call => call.CommandKey));
        Assert.All(operatorCalls, call => Assert.Equal($"Bearer {OperatorTestFixture.Token}", call.Authorization));
        Assert.All(operatorCalls, call => Assert.Equal(RunId, call.Payload.Context.SubjectId));

        // A deferring step gets its own state back, and the next step gets the state of the step before it.
        Assert.Equal<IEnumerable<string?>>([null, "run.admit:1"], StatesSentTo("run.admit"));
        Assert.Equal<IEnumerable<string?>>(["run.admit:2"], StatesSentTo("run.create-job"));
        Assert.Equal<IEnumerable<string?>>(
            ["run.await-archive:1", "run.await-result:1", "run.await-result:2"],
            StatesSentTo("run.await-result")
        );
        Assert.Equal(
            [0, 1, 2],
            operatorCalls.Where(c => c.CommandKey == "run.await-result").Select(c => c.Payload.DeferCount)
        );

        string?[] StatesSentTo(string commandKey) =>
            [.. operatorCalls.Where(call => call.CommandKey == commandKey).Select(call => call.Payload.State)];
    }

    /// <summary>
    /// The enqueue request the operator sends for a run: one workflow with the six run steps, the run as the context
    /// and the labels the operator lists runs by.
    /// </summary>
    private static WorkflowEnqueueRequest CreateRunRequest(string kind = "upgrade-v9") =>
        new()
        {
            Context = JsonSerializer.SerializeToElement(
                new OperatorWorkflowContext
                {
                    Domain = "runs",
                    Caller = "assistant",
                    SubjectId = RunId,
                }
            ),
            Labels = new Dictionary<string, string>
            {
                ["runId"] = RunId,
                ["kind"] = kind,
                ["caller"] = "assistant",
            },
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "run",
                    OperationId = $"run-{RunId}",
                    Steps =
                    [
                        .. _runSteps.Select(commandKey => new StepRequest
                        {
                            OperationId = commandKey,
                            Command = Operator.Commands.OperatorCommand.OperatorCommand.Create(
                                new OperatorCommandData { CommandKey = commandKey }
                            ),
                        }),
                    ],
                },
            ],
        };

    /// <summary>
    /// Makes WireMock answer each callback like the operator: a step in <paramref name="deferrals"/> defers that many
    /// times before it completes. Every answer carries a state named after the step and its call count, so the test
    /// can see where each step's state came from.
    /// </summary>
    private ConcurrentQueue<OperatorCall> StubOperator(Dictionary<string, int> deferrals)
    {
        var calls = new ConcurrentQueue<OperatorCall>();
        var callCounts = new ConcurrentDictionary<string, int>();

        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(
                Request.Create().WithPath(new RegexMatcher($"^{OperatorTestFixture.CallbackPath}[^/]+$")).UsingPost()
            )
            .RespondWith(
                Response
                    .Create()
                    .WithCallback(request =>
                    {
                        var payload = JsonSerializer.Deserialize<OperatorCallbackPayload>(request.Body!)!;
                        request.Headers!.TryGetValue("Authorization", out var authorization);
                        calls.Enqueue(new OperatorCall(payload.CommandKey, payload, authorization?.SingleOrDefault()));

                        var count = callCounts.AddOrUpdate(payload.CommandKey, 1, (_, previous) => previous + 1);
                        var state = $"{payload.CommandKey}:{count}";
                        object answer =
                            count <= deferrals.GetValueOrDefault(payload.CommandKey)
                                ? new { state, defer = new { delay = "00:00:01", reason = "waiting" } }
                                : new { state };

                        return new ResponseMessage
                        {
                            StatusCode = 200,
                            Headers = new Dictionary<string, WireMockList<string>>
                            {
                                ["Content-Type"] = new("application/json"),
                            },
                            BodyData = new BodyData
                            {
                                BodyAsString = JsonSerializer.Serialize(answer),
                                DetectedBodyType = BodyType.String,
                                Encoding = Encoding.UTF8,
                            },
                        };
                    })
            );

        return calls;
    }

    private sealed record OperatorCall(string CommandKey, OperatorCallbackPayload Payload, string? Authorization);
}

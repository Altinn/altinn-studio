// CA1305: StringBuilder interpolation locale — plaintext HTTP output, not locale-sensitive
#pragma warning disable CA1305

using System.Text;
using System.Text.Json;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.App.Tests.Integration;

public sealed partial class AppCommandIntegrationTests
{
    /// <summary>
    /// Documents the full HTTP exchange for a multi-step AppCommand workflow.
    /// Step 1 returns state that propagates to step 2, demonstrating the full
    /// AppCommand lifecycle including metadata headers, callback payloads, and
    /// state propagation — all serialized as raw HTTP text.
    /// </summary>
    [Fact]
    public async Task AppCommand_FullHttpChatter_DocumentsExchange()
    {
        var output = TestContext.Current.TestOutputHelper!;
        var correlationId = Guid.NewGuid();

        // Arrange — WireMock stubs: both steps return state to demonstrate propagation.
        // Catch-all first, then specific stubs (WireMock: more specific match wins).
        fixture.WireMock.ResetMappings();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(200));

        var callbackBasePath =
            $"/{EngineAppFixture.DefaultOrg}/{EngineAppFixture.DefaultApp}"
            + $"/instances/{EngineAppFixture.DefaultPartyId}/{EngineAppFixture.DefaultInstanceGuid}";

        fixture
            .WireMock.Given(Request.Create().WithPath($"{callbackBasePath}/chatter-step-1"))
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "application/json")
                    .WithBody("""{"state": "step-1-result"}""")
            );

        fixture
            .WireMock.Given(Request.Create().WithPath($"{callbackBasePath}/chatter-step-2"))
            .RespondWith(
                Response
                    .Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "application/json")
                    .WithBody("""{"state": "step-2-result"}""")
            );

        var step1 = AppTestHelpers.CreateAppCommandStep("chatter-step-1", payload: "step-1-payload");
        var step2 = AppTestHelpers.CreateAppCommandStep("chatter-step-2", payload: "step-2-payload");
        var workflow = _testHelpers.CreateWorkflow("chatter-wf", [step1, step2]) with
        {
            State = "initial-workflow-state",
        };
        var request = AppTestHelpers.CreateEnqueueRequest(workflow, lockToken: InstanceLockToken);

        // Use a recording client to capture the actual inbound HTTP exchange
        const string testNamespace = "chatter-app-test";
        var recorder = new HttpExchangeRecorder();
        using var client = new EngineApiClient(fixture, testNamespace, recorder);

        // Act
        var response = await client.EnqueueWithQueryParams(
            request,
            idempotencyKey: "app-chatter-idem",
            correlationId: correlationId
        );
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Capture outbound requests (from WireMock) and inbound exchanges (from recorder)
        var logs = fixture
            .WireMock.LogEntries.Where(l =>
                l.RequestMessage.AbsolutePath.Contains("chatter-step", StringComparison.OrdinalIgnoreCase)
            )
            .OrderBy(l => l.RequestMessage.DateTime)
            .ToList();
        var enqueueExchange = recorder.Exchanges.First(e => e.Request.Method == HttpMethod.Post);
        var getExchange = recorder.Exchanges.Last(e =>
            e.Request.Method == HttpMethod.Get
            && e.Request.RequestUri?.PathAndQuery.Contains($"/workflows/{workflowId}", StringComparison.Ordinal) == true
        );

        // --- Serialize as raw HTTP ---

        var http = new StringBuilder();

        // 1. Inbound enqueue request/response (captured from the wire)
        http.AppendLine("###");
        http.AppendLine("### 1. Client → Engine: Enqueue workflow");
        http.AppendLine("###");
        http.AppendLine();
        HttpChatterHelpers.WriteExchange(http, enqueueExchange);

        // 2+3. Outbound callback requests (captured by WireMock)
        for (int i = 0; i < logs.Count; i++)
        {
            var log = logs[i];
            var stepNumber = i + 1;

            http.AppendLine();
            http.AppendLine("###");
            http.AppendLine(
                $"### {stepNumber + 1}. Engine → App: Step {stepNumber} callback ({log.RequestMessage.AbsolutePath})"
            );
            http.AppendLine("###");
            http.AppendLine();

            HttpChatterHelpers.WriteRequest(http, log);
            HttpChatterHelpers.WriteResponse(http, log);
        }

        // 4. Final workflow status (captured from the wire)
        http.AppendLine();
        http.AppendLine("###");
        http.AppendLine($"### {logs.Count + 2}. Client → Engine: Get completed workflow");
        http.AppendLine("###");
        http.AppendLine();
        HttpChatterHelpers.WriteExchange(http, getExchange);

        var httpText = http.ToString();
        output.WriteLine(HttpChatterHelpers.Scrub(httpText));

        await HttpChatterHelpers.PersistSnapshot(
            httpText,
            "AppCommandIntegrationTests.AppCommand_FullHttpChatter_DocumentsExchange.http",
            TestContext.Current.CancellationToken
        );

        // --- Assertions ---

        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(2, status.Steps.Count);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));
        Assert.Equal(2, logs.Count);
        Assert.All(logs, l => Assert.Equal("POST", l.RequestMessage.Method, ignoreCase: true));

        // Verify AppCallbackPayload bodies
        var step1Body = JsonSerializer.Deserialize<AppCallbackPayload>(logs[0].RequestMessage.Body!);
        Assert.NotNull(step1Body);
        Assert.Equal("chatter-step-1", step1Body.CommandKey);
        Assert.Equal(InstanceLockToken, step1Body.LockToken);
        Assert.Equal("step-1-payload", step1Body.Payload);
        Assert.Equal("initial-workflow-state", step1Body.State);

        var step2Body = JsonSerializer.Deserialize<AppCallbackPayload>(logs[1].RequestMessage.Body!);
        Assert.NotNull(step2Body);
        Assert.Equal("chatter-step-2", step2Body.CommandKey);
        Assert.Equal(InstanceLockToken, step2Body.LockToken);
        Assert.Equal("step-2-payload", step2Body.Payload);
        Assert.Equal("step-1-result", step2Body.State);

        // Assert metadata + auth headers on outbound requests
        foreach (var log in logs)
        {
            var headers = log.RequestMessage.Headers;
            Assert.NotNull(headers);

            Assert.NotEqual("(missing)", HttpChatterHelpers.GetHeader(headers, "X-Api-Key"));

            var workflowIdHeader = HttpChatterHelpers.GetHeader(headers, WorkflowMetadataConstants.Headers.WorkflowId);
            Assert.True(
                Guid.TryParse(workflowIdHeader, out var parsedWorkflowId),
                $"{WorkflowMetadataConstants.Headers.WorkflowId} should be a valid GUID"
            );
            Assert.Equal(workflowId, parsedWorkflowId);

            var stepOpId = HttpChatterHelpers.GetHeader(headers, WorkflowMetadataConstants.Headers.OperationId);
            Assert.NotEmpty(stepOpId);

            var idemKey = HttpChatterHelpers.GetHeader(headers, WorkflowMetadataConstants.Headers.IdempotencyKey);
            Assert.NotEqual("(missing)", idemKey);

            Assert.Equal(
                "chatter-app-test",
                HttpChatterHelpers.GetHeader(headers, WorkflowMetadataConstants.Headers.Namespace)
            );
            Assert.Equal(
                correlationId.ToString(),
                HttpChatterHelpers.GetHeader(headers, WorkflowMetadataConstants.Headers.CorrelationId)
            );
        }
    }
}

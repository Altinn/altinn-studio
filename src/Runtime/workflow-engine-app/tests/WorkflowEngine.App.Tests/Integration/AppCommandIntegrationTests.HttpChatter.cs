using System.Text;
using System.Text.Json;
using WireMock.Matchers;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.App.Tests.Integration;

public sealed partial class AppCommandIntegrationTests
{
    private static readonly JsonSerializerOptions s_indentedJson = new() { WriteIndented = true };

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

        // Act
        var response = await _client.Enqueue(
            request,
            ns: "chatter-app-test",
            idempotencyKey: "app-chatter-idem",
            correlationId: correlationId
        );
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Completed,
            ns: "chatter-app-test"
        );

        // Capture outbound requests
        var logs = fixture
            .WireMock.LogEntries.Where(l =>
                l.RequestMessage.AbsolutePath.Contains("chatter-step", StringComparison.OrdinalIgnoreCase)
            )
            .OrderBy(l => l.RequestMessage.DateTime)
            .ToList();

        // --- Serialize as raw HTTP ---

        var http = new StringBuilder();

        // Inbound request
        http.AppendLine("###");
        http.AppendLine("### 1. Client → Engine: Enqueue workflow");
        http.AppendLine("###");
        http.AppendLine();
        http.AppendLine("POST /api/v1/workflows HTTP/1.1");
        http.AppendLine("Content-Type: application/json");
        http.AppendLine("Idempotency-Key: app-chatter-idem");
        http.AppendLine("Workflow-Namespace: chatter-app-test");
        http.AppendLine($"Correlation-Id: {correlationId}");
        http.AppendLine();
        http.AppendLine(JsonSerializer.Serialize(request, s_indentedJson));
        http.AppendLine();

        // Inbound response
        http.AppendLine("HTTP/1.1 201 Created");
        http.AppendLine("Content-Type: application/json");
        http.AppendLine();
        http.AppendLine(JsonSerializer.Serialize(response, s_indentedJson));

        // Outbound callback requests
        for (int i = 0; i < logs.Count; i++)
        {
            var log = logs[i];
            var headers = log.RequestMessage.Headers;
            var stepNumber = i + 1;

            http.AppendLine();
            http.AppendLine("###");
            http.AppendLine(
                $"### {stepNumber + 1}. Engine → App: Step {stepNumber} callback ({log.RequestMessage.AbsolutePath})"
            );
            http.AppendLine("###");
            http.AppendLine();

            // Request line + headers
            http.AppendLine($"{log.RequestMessage.Method} {log.RequestMessage.AbsolutePath} HTTP/1.1");
            http.AppendLine($"Host: {log.RequestMessage.Host}");
            http.AppendLine($"Idempotency-Key: {GetHeader(headers, "Idempotency-Key")}");
            http.AppendLine($"Workflow-Id: {GetHeader(headers, "Workflow-Id")}");
            http.AppendLine($"Step-Operation-Id: {GetHeader(headers, "Step-Operation-Id")}");
            http.AppendLine($"Workflow-Namespace: {GetHeader(headers, "Workflow-Namespace")}");
            http.AppendLine($"Correlation-Id: {GetHeader(headers, "Correlation-Id")}");
            http.AppendLine($"X-Api-Key: {GetHeader(headers, "X-Api-Key")}");

            var ct = GetHeader(headers, "Content-Type");
            if (ct != "(missing)")
                http.AppendLine($"Content-Type: {ct}");

            http.AppendLine();

            // Body (AppCallbackPayload)
            if (log.RequestMessage.Body is { } body)
                http.AppendLine(FormatJsonOrRaw(body));

            // Response
            http.AppendLine();
            http.AppendLine($"HTTP/1.1 {log.ResponseMessage.StatusCode}");

            if (log.ResponseMessage.BodyData?.BodyAsString is { } responseBody)
            {
                http.AppendLine("Content-Type: application/json");
                http.AppendLine();
                http.AppendLine(FormatJsonOrRaw(responseBody));
            }
        }

        // Final workflow status
        http.AppendLine();
        http.AppendLine("###");
        http.AppendLine($"### {logs.Count + 2}. Client → Engine: Get completed workflow");
        http.AppendLine("###");
        http.AppendLine();
        http.AppendLine($"GET /api/v1/workflows/{workflowId}?namespace=chatter-app-test HTTP/1.1");
        http.AppendLine();
        http.AppendLine("HTTP/1.1 200 OK");
        http.AppendLine("Content-Type: application/json");
        http.AppendLine();
        http.AppendLine(JsonSerializer.Serialize(status, s_indentedJson));

        var httpText = http.ToString();
        output.WriteLine(httpText);

        // Persist to .snapshots/ alongside other verified snapshot files
        var snapshotDir = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".snapshots");
        Directory.CreateDirectory(snapshotDir);
        await File.WriteAllTextAsync(
            Path.Combine(snapshotDir, "AppCommandIntegrationTests.AppCommand_FullHttpChatter_DocumentsExchange.http"),
            httpText,
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

            Assert.NotEqual("(missing)", GetHeader(headers, "X-Api-Key"));

            var workflowIdHeader = GetHeader(headers, "Workflow-Id");
            Assert.True(
                Guid.TryParse(workflowIdHeader, out var parsedWorkflowId),
                "Workflow-Id should be a valid GUID"
            );
            Assert.Equal(workflowId, parsedWorkflowId);

            var stepOpId = GetHeader(headers, "Step-Operation-Id");
            Assert.NotEmpty(stepOpId);

            var idemKey = GetHeader(headers, "Idempotency-Key");
            Assert.NotEqual("(missing)", idemKey);

            Assert.Equal("chatter-app-test", GetHeader(headers, "Workflow-Namespace"));
            Assert.Equal(correlationId.ToString(), GetHeader(headers, "Correlation-Id"));
        }
    }

    private static string GetHeader(IDictionary<string, WireMock.Types.WireMockList<string>>? headers, string name)
    {
        if (headers is null)
            return "(missing)";

        if (headers.TryGetValue(name, out var values))
            return values.FirstOrDefault() ?? "(missing)";

        var match = headers.FirstOrDefault(kvp => string.Equals(kvp.Key, name, StringComparison.OrdinalIgnoreCase));
        return match.Value?.FirstOrDefault() ?? "(missing)";
    }

    private static string FormatJsonOrRaw(string content)
    {
        try
        {
            using var doc = JsonDocument.Parse(content);
            return JsonSerializer.Serialize(doc, s_indentedJson);
        }
        catch
        {
            return content;
        }
    }
}

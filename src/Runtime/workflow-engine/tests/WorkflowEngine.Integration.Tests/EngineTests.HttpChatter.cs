using System.Text;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    /// <summary>
    /// Documents the full HTTP exchange for a multi-step WebhookCommand workflow.
    /// Captures both inbound (enqueue) and outbound (webhook) requests, serializes
    /// the complete exchange as raw HTTP text to test output for human review.
    /// </summary>
    [Fact]
    public async Task WebhookCommand_FullHttpChatter_DocumentsExchange()
    {
        var output = TestContext.Current.TestOutputHelper!;
        var correlationId = Guid.NewGuid();

        // Arrange — 2-step workflow: POST with payload, then GET without payload.
        var step1 = _testHelpers.CreateWebhookStep("/step-1", payload: "step-1-data", contentType: "text/plain");
        var step2 = _testHelpers.CreateWebhookStep("/step-2");
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("chatter-wf", [step1, step2]),
            includeContext: false
        );

        // Use a recording client to capture the actual inbound HTTP exchange
        var recorder = new HttpExchangeRecorder();
        using var client = new EngineApiClient(fixture, recorder);

        // Act
        var response = await client.Enqueue(
            request,
            ns: "chatter-test",
            idempotencyKey: "chatter-idem-key",
            correlationId: correlationId
        );
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed, ns: "chatter-test");

        // Capture outbound requests (from WireMock) and inbound exchanges (from recorder)
        var logs = fixture.WireMock.LogEntries;
        var enqueueExchange = recorder.Exchanges.First(e => e.Request.Method == HttpMethod.Post);
        var getExchange = recorder.Exchanges.Last(e =>
            e.Request.Method == HttpMethod.Get && e.Response.IsSuccessStatusCode
        );

        // --- Serialize as raw HTTP ---

        var http = new StringBuilder();

        // 1. Inbound enqueue request/response (captured from the wire)
        http.AppendLine("###");
        http.AppendLine("### 1. Client → Engine: Enqueue workflow");
        http.AppendLine("###");
        http.AppendLine();
        HttpChatterHelpers.WriteExchange(http, enqueueExchange);

        // 2+3. Outbound webhook requests (captured by WireMock)
        for (int i = 0; i < logs.Count; i++)
        {
            var log = logs[i];
            var stepNumber = i + 1;

            http.AppendLine();
            http.AppendLine("###");
            http.AppendLine(
                $"### {stepNumber + 1}. Engine → Webhook: Step {stepNumber} ({log.RequestMessage.Method} {log.RequestMessage.AbsolutePath})"
            );
            http.AppendLine("###");
            http.AppendLine();

            HttpChatterHelpers.WriteRequest(http, log);
            http.AppendLine();
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
        output.WriteLine(httpText);

        // Persist to .snapshots/ alongside other verified snapshot files
        var snapshotDir = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".snapshots");
        Directory.CreateDirectory(snapshotDir);
        await File.WriteAllTextAsync(
            Path.Combine(snapshotDir, "EngineTests.WebhookCommand_FullHttpChatter_DocumentsExchange.http"),
            httpText,
            TestContext.Current.CancellationToken
        );

        // --- Assertions ---

        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(2, status.Steps.Count);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));
        Assert.Equal(2, logs.Count);

        // Step 1: POST with payload
        Assert.Equal("POST", logs[0].RequestMessage.Method, ignoreCase: true);
        Assert.Contains("/step-1", logs[0].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("step-1-data", logs[0].RequestMessage.Body);

        // Step 2: GET without payload
        Assert.Equal("GET", logs[1].RequestMessage.Method, ignoreCase: true);
        Assert.Contains("/step-2", logs[1].RequestMessage.AbsolutePath, StringComparison.OrdinalIgnoreCase);

        // Assert metadata headers on each outbound request
        foreach (var log in logs)
        {
            var headers = log.RequestMessage.Headers;
            Assert.NotNull(headers);

            var workflowIdHeader = HttpChatterHelpers.GetHeader(headers, WorkflowMetadataConstants.Headers.WorkflowId);
            Assert.True(
                Guid.TryParse(workflowIdHeader, out var parsedWorkflowId),
                $"{WorkflowMetadataConstants.Headers.WorkflowId} should be a valid GUID"
            );
            Assert.Equal(workflowId, parsedWorkflowId);

            var stepOpId = HttpChatterHelpers.GetHeader(headers, WorkflowMetadataConstants.Headers.OperationId);
            Assert.NotEmpty(stepOpId);

            var idemKey = HttpChatterHelpers.GetHeader(headers, WorkflowMetadataConstants.Headers.IdempotencyKey);
            Assert.Equal($"chatter-idem-key/{stepOpId}", idemKey);

            Assert.Equal(
                "chatter-test",
                HttpChatterHelpers.GetHeader(headers, WorkflowMetadataConstants.Headers.Namespace)
            );
            Assert.Equal(
                correlationId.ToString(),
                HttpChatterHelpers.GetHeader(headers, WorkflowMetadataConstants.Headers.CorrelationId)
            );
        }
    }
}

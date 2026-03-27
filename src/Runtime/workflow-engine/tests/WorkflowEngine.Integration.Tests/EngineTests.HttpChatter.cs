using System.Text;
using System.Text.Json;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    private static readonly JsonSerializerOptions s_indentedJson = new() { WriteIndented = true };

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

        // Act
        var response = await _client.Enqueue(
            request,
            ns: "chatter-test",
            idempotencyKey: "chatter-idem-key",
            correlationId: correlationId
        );
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Completed,
            ns: "chatter-test"
        );

        // Capture outbound requests
        var logs = fixture.WireMock.LogEntries;

        // --- Serialize as raw HTTP ---

        var http = new StringBuilder();

        // Inbound request
        http.AppendLine("###");
        http.AppendLine("### 1. Client → Engine: Enqueue workflow");
        http.AppendLine("###");
        http.AppendLine();
        http.AppendLine("POST /api/v1/workflows HTTP/1.1");
        http.AppendLine("Content-Type: application/json");
        http.AppendLine("Idempotency-Key: chatter-idem-key");
        http.AppendLine("Workflow-Namespace: chatter-test");
        http.AppendLine($"Correlation-Id: {correlationId}");
        http.AppendLine();
        http.AppendLine(JsonSerializer.Serialize(request, s_indentedJson));
        http.AppendLine();

        // Inbound response
        http.AppendLine("HTTP/1.1 201 Created");
        http.AppendLine("Content-Type: application/json");
        http.AppendLine();
        http.AppendLine(JsonSerializer.Serialize(response, s_indentedJson));

        // Outbound requests
        for (int i = 0; i < logs.Count; i++)
        {
            var log = logs[i];
            var headers = log.RequestMessage.Headers;
            var stepNumber = i + 1;

            http.AppendLine();
            http.AppendLine("###");
            http.AppendLine(
                $"### {stepNumber + 1}. Engine → Webhook: Step {stepNumber} ({log.RequestMessage.Method} {log.RequestMessage.AbsolutePath})"
            );
            http.AppendLine("###");
            http.AppendLine();

            // Request
            http.AppendLine($"{log.RequestMessage.Method} {log.RequestMessage.AbsolutePath} HTTP/1.1");
            http.AppendLine($"Host: {log.RequestMessage.Host}");
            http.AppendLine($"Idempotency-Key: {GetHeader(headers, "Idempotency-Key")}");
            http.AppendLine($"Workflow-Id: {GetHeader(headers, "Workflow-Id")}");
            http.AppendLine($"Operation-Id: {GetHeader(headers, "Operation-Id")}");
            http.AppendLine($"Workflow-Namespace: {GetHeader(headers, "Workflow-Namespace")}");
            http.AppendLine($"Correlation-Id: {GetHeader(headers, "Correlation-Id")}");

            if (log.RequestMessage.Body is { } body)
            {
                var ct = GetHeader(headers, "Content-Type");
                if (ct != "(missing)")
                    http.AppendLine($"Content-Type: {ct}");
                http.AppendLine();
                http.AppendLine(FormatJsonOrRaw(body));
            }
            else
            {
                http.AppendLine();
            }

            // Response
            http.AppendLine();
            http.AppendLine($"HTTP/1.1 {log.ResponseMessage.StatusCode}");

            if (log.ResponseMessage.BodyData?.BodyAsString is { } responseBody)
            {
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
        http.AppendLine($"GET /api/v1/workflows/{workflowId}?namespace=chatter-test HTTP/1.1");
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

            var workflowIdHeader = GetHeader(headers, "Workflow-Id");
            Assert.True(
                Guid.TryParse(workflowIdHeader, out var parsedWorkflowId),
                "Workflow-Id should be a valid GUID"
            );
            Assert.Equal(workflowId, parsedWorkflowId);

            var stepOpId = GetHeader(headers, "Operation-Id");
            Assert.NotEmpty(stepOpId);

            var idemKey = GetHeader(headers, "Idempotency-Key");
            Assert.Equal($"chatter-idem-key/{stepOpId}", idemKey);

            Assert.Equal("chatter-test", GetHeader(headers, "Workflow-Namespace"));
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

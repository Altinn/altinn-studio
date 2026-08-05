using System.Text.Json;
using WorkflowEngine.Commands.Extensions;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests.Extensions;

/// <summary>
/// The workflow metadata headers on outbound command requests. The OperationId is a free-text
/// display identity, so it must never be able to poison the request: a header write that throws
/// would fail the step on every attempt, turning a cosmetic string into an unrecoverable retry
/// loop.
/// </summary>
public class OutboundHeaderExtensionsTests
{
    private static CommandExecutionContext CreateContext(string operationId) =>
        new()
        {
            Workflow = new Workflow
            {
                OperationId = "test-op",
                IdempotencyKey = "test-key",
                Namespace = "test-ns",
                Context = JsonSerializer.SerializeToElement(new { }),
                Status = PersistentItemStatus.Processing,
                Steps = [],
                CollectionKey = "test-collection",
            },
            Step = new Step
            {
                OperationId = operationId,
                ProcessingOrder = 0,
                Command = CommandDefinition.Create("webhook"),
            },
        };

    [Fact]
    public void AddWorkflowMetadataHeaders_AsciiOperationId_PassesThroughVerbatim()
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://app.example/callback");

        request.AddWorkflowMetadataHeaders(CreateContext("ExecuteServiceTask: DispatchOrder"));

        Assert.Equal(
            "ExecuteServiceTask: DispatchOrder",
            Assert.Single(request.Headers.GetValues(WorkflowMetadataConstants.Headers.OperationId))
        );
    }

    [Fact]
    public void AddWorkflowMetadataHeaders_NonAsciiOperationId_IsSubstitutedInsteadOfThrowing()
    {
        // Regression: "ExecuteServiceTask · DispatchOrder" (non-ASCII '·') threw
        // "Request headers must contain only ASCII characters" on every dispatch attempt,
        // leaving the workflow requeuing forever.
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://app.example/callback");

        request.AddWorkflowMetadataHeaders(CreateContext("ExecuteServiceTask · Godkjenning på vent"));

        Assert.Equal(
            "ExecuteServiceTask ? Godkjenning p? vent",
            Assert.Single(request.Headers.GetValues(WorkflowMetadataConstants.Headers.OperationId))
        );
    }
}

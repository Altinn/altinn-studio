using System.Net;
using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    /// <summary>
    /// Creates a two-step workflow where step-1 (producer) has a <c>Ref</c> and step-2 (consumer)
    /// uses <c>WaitForReplyFrom</c> to suspend until a reply arrives.
    /// Returns the workflow ID after it reaches <see cref="PersistentItemStatus.Suspended"/>.
    /// </summary>
    private async Task<(Guid WorkflowId, Guid ReplyId)> ArrangeWorkflowWaitingForReply()
    {
        var steps = new[]
        {
            _testHelpers.CreateWebhookStep("/producer-hook") with
            {
                Ref = "producer",
            },
            _testHelpers.CreateWebhookStep("/consumer-hook") with
            {
                WaitForReplyFrom = "producer",
            },
        };
        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", steps));

        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;

        // Wait for the producer step to complete and the workflow to suspend on the consumer step.
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Suspended);

        // Query the database to discover the ReplyId (not exposed via the REST API).
        await using var context = fixture.GetDbContext();
        var replyStep = await context
            .Steps.Include(s => s.ReceivedReply)
            .Where(s => s.JobId == workflowId && s.ReceivedReply != null)
            .SingleAsync(TestContext.Current.CancellationToken);

        var replyId = replyStep.ReceivedReply!.Id;
        return (workflowId, replyId);
    }

    [Fact]
    public async Task SubmitReply_AcceptedAndWorkflowCompletes()
    {
        // Arrange
        var (workflowId, replyId) = await ArrangeWorkflowWaitingForReply();

        // Act — submit the reply
        await _client.SubmitReply(replyId, "idem-accept-1", new SubmitReplyRequest { Payload = "hello" });

        // Assert — the workflow should resume and complete
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));
    }

    [Fact]
    public async Task SubmitReply_DuplicateReturnsSameResult()
    {
        // Arrange
        var (workflowId, replyId) = await ArrangeWorkflowWaitingForReply();
        const string idempotencyKey = "idem-dup-1";
        var payload = new SubmitReplyRequest { Payload = "same-payload" };

        // Act — first submission
        using var first = await _client.SubmitReplyRaw(replyId, idempotencyKey, payload);

        // Wait for the workflow to complete to ensure all DB transitions are done
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Act — duplicate submission (same key + same payload)
        using var second = await _client.SubmitReplyRaw(replyId, idempotencyKey, payload);

        // Assert
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
    }

    [Fact]
    public async Task SubmitReply_ConflictReturns409()
    {
        // Arrange
        var (workflowId, replyId) = await ArrangeWorkflowWaitingForReply();
        const string idempotencyKey = "idem-conflict-1";

        // Act — first submission
        using var first = await _client.SubmitReplyRaw(
            replyId,
            idempotencyKey,
            new SubmitReplyRequest { Payload = "payload-a" }
        );

        // Wait for the workflow to complete
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Act — conflicting submission (same key, different payload)
        using var second = await _client.SubmitReplyRaw(
            replyId,
            idempotencyKey,
            new SubmitReplyRequest { Payload = "payload-b" }
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task SubmitReply_UnknownReplyId_Returns404()
    {
        // Act — submit a reply for a non-existent reply ID
        using var response = await _client.SubmitReplyRaw(
            Guid.NewGuid(),
            "idem-notfound-1",
            new SubmitReplyRequest { Payload = "irrelevant" }
        );

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task SubmitReply_MissingIdempotencyKey_Returns400()
    {
        // Arrange — build a raw request without the Idempotency-Key header
        using var httpClient = fixture.CreateEngineClient();
        using var message = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/replies/{Guid.NewGuid()}")
        {
            Content = System.Net.Http.Json.JsonContent.Create(new SubmitReplyRequest { Payload = "test" }),
        };
        // No Idempotency-Key header

        // Act
        using var response = await httpClient.SendAsync(message, TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task SubmitReply_NullPayload_AcceptsAndCompletes()
    {
        // Arrange
        var (workflowId, replyId) = await ArrangeWorkflowWaitingForReply();

        // Act — submit with null payload
        await _client.SubmitReply(replyId, "idem-null-payload-1", new SubmitReplyRequest());

        // Assert
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
    }
}
